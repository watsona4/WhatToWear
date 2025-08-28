import json
import logging
import os
from datetime import date, datetime, timedelta
from json import JSONDecodeError

import redis  # type: ignore
from flask import Blueprint, jsonify, request

from ..providers.open_meteo import OpenMeteoProvider
from .rules_engine import LazyConfig, WearHistory, choose_outfit, evaluate_rules

LOG = logging.getLogger(__name__)
api2_bp = Blueprint("api2", __name__)

CFG = LazyConfig({
    "outfits": os.environ.get("OUTFITS_PATH", "./config/outfits.yaml"),
    "rules": os.environ.get("RULES_PATH", "./config/rules.yaml"),
})

pwd = os.environ.get("REDIS_PASSWORD", "")
host = os.environ.get("REDIS_HOST", "redis")
REDIS_URL = os.environ.get("REDIS_URL") or (
    f"redis://:{pwd}@{host}:6379/0" if pwd else f"redis://{host}:6379/0"
)
REDIS = redis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None


# ---------- availability helpers ----------
def _today_local() -> date:
    # If you need real timezone handling later, thread tz from provider.
    return date.today()


def _closet_items():
    """Load closet items from JSON (names/types)."""
    path = os.environ.get("CLOSET_PATH", "./config/closet.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        items = data.get("items", [])
        # normalize structure
        out = []
        for it in items:
            name = (it or {}).get("name")
            typ = ((it or {}).get("type") or "").lower()
            if name and typ:
                out.append({"name": name, "type": typ})
        return out
    except (FileNotFoundError, JSONDecodeError, OSError, ValueError) as e:
        LOG.warning("closet.json load problem: %s", e)
        return []


def _next_monday(d: date) -> date:
    # Monday = 0 ... Sunday = 6
    days = (0 - d.weekday()) % 7
    if days == 0:
        days = 7
    return d + timedelta(days=days)


def _available_on_for(item_type: str, last_worn: date | None) -> date:
    """Cooldowns:
    - outer: next day
    - top/bottom: next Monday
    - accessories/shoes: same day (no cooldown)
    """
    if last_worn is None:
        return _today_local()
    if item_type == "outer":
        return last_worn + timedelta(days=1)
    if item_type in ("top", "bottom"):
        return _next_monday(last_worn)
    return _today_local()


def _lw_key(name: str) -> str:
    return f"wtw:last_worn:{name}"


def _wear_key(d: date | str) -> str:
    iso = d if isinstance(d, str) else d.isoformat()
    return f"wtw:wear:{iso}"


@api2_bp.route("/v2/suggest", methods=["GET"])
def suggest():
    lat = float(request.args.get("lat", os.environ.get("LAT", "42.6526")))
    lon = float(request.args.get("lon", os.environ.get("LON", "-73.7562")))
    tz = os.environ.get("TZ", "America/New_York")
    weather = OpenMeteoProvider(lat, lon, tz).fetch()
    ctx = {
        "temperature_f": weather["current"]["temp_f"],
        "wind_mph": weather["current"]["wind_mph"],
        "apparent_f": weather["daily"]["high_f"],
        "precip_prob": weather["daily"]["precip_prob_max"],
        "uv_index": weather["daily"]["uv_index_max"],
        "max_temp_f": weather["daily"]["high_f"],
        "min_temp_f": weather["daily"]["low_f"],
        "min_precip_prob": weather["daily"]["precip_prob_max"],
        "min_uv_index": weather["daily"]["uv_index_max"],
        "min_wind_mph": weather["daily"]["wind_mph_max"],
    }
    rules_cfg, outfits = CFG.rules(), CFG.outfits()
    effects = evaluate_rules(rules_cfg, ctx)
    hist = WearHistory(
        backend=rules_cfg.get("history", {}).get("backend", "json"),
        json_path=rules_cfg.get("history", {}).get("json_path", "./data/wear_history.json"),
        redis=REDIS,
    )
    pick = choose_outfit(outfits, effects["tags"], ctx, hist, rules_cfg)
    return jsonify({
        "weather": weather,
        "effects": effects,
        "outfit": {"id": pick.id, "name": pick.name, "tags": pick.tags, "pieces": pick.pieces},
    })


@api2_bp.route("/v2/history", methods=["POST"])
def record():
    body = request.get_json(force=True)
    outfit_id = body.get("outfit_id")
    date = body.get("date")
    rules_cfg = CFG.rules()
    hist = WearHistory(
        backend=rules_cfg.get("history", {}).get("backend", "json"),
        json_path=rules_cfg.get("history", {}).get("json_path", "./data/wear_history.json"),
        redis=REDIS,
    )
    hist.record(outfit_id, date=date)
    return jsonify({"ok": True})


# ---------- new: availability + selection ----------
@api2_bp.route("/v2/availability", methods=["GET"])
def availability():
    """Return next-available date (ISO) for each closet item based on last worn + type."""
    items = _closet_items()
    names = [i["name"] for i in items]
    today_iso = _today_local().isoformat()
    if not names:
        return jsonify({"availability": {}, "today": today_iso, "last_worn": {}})

    if REDIS is None:
        # No Redis configured: treat all items as available today
        return jsonify({
            "availability": {n: today_iso for n in names},
            "today": today_iso,
            "last_worn": {},
            "warning": "redis_not_configured",
        })

    # bulk fetch last worn
    try:
        vals = REDIS.mget([_lw_key(n) for n in names])
    except Exception as e:
        LOG.warning("redis error during availability: %s", e)
        # Treat as available today rather than 500
        return jsonify({
            "availability": {n: today_iso for n in names},
            "today": today_iso,
            "last_worn": {},
            "warning": "redis_unavailable",
        })
    name_to_last: dict[str, date | None] = {}
    for n, v in zip(names, vals):
        if not v:
            name_to_last[n] = None
            continue
        try:
            name_to_last[n] = datetime.strptime(v, "%Y-%m-%d").date()
        except Exception:
            name_to_last[n] = None

    # compute next available + surface last worn
    avail: dict[str, str] = {}
    last_map: dict[str, str | None] = {}
    for it in items:
        n = it["name"]
        t = it["type"]
        lw = name_to_last.get(n)
        last_map[n] = lw.isoformat() if lw else None
        avail[n] = _available_on_for(t, lw).isoformat()

    return jsonify({"availability": avail, "today": today_iso, "last_worn": last_map})


@api2_bp.route("/v2/selection", methods=["POST"])
def save_selection():
    """Record selected combo items as 'last worn' for today (or provided date).
    Body: { "items": ["Top","Bottom","Outer",...], "dt": "YYYY-MM-DD"(optional) }
    """
    if REDIS is None:
        return jsonify({"ok": False, "error": "redis not configured"}), 503

    data = request.get_json(force=True, silent=True) or {}
    items = data.get("items")
    if not isinstance(items, list) or not items:
        return jsonify({"ok": False, "error": "items required"}), 400

    if data.get("dt"):
        try:
            worn = datetime.strptime(data["dt"], "%Y-%m-%d").date()
        except Exception:
            return jsonify({"ok": False, "error": "bad date"}), 400
    else:
        worn = _today_local()

    iso = worn.isoformat()
    pipe = REDIS.pipeline()
    for name in items:
        pipe.set(_lw_key(str(name)), iso)
    pipe.execute()

    # Also store/accumulate the day's outfit as a SET (union across multiple selections that day).
    # Migration-friendly: if key exists as a JSON string from older versions, migrate to a set.
    wear_key = _wear_key(iso)
    try:
        # Fast path: add all items to the set
        if items:
            REDIS.sadd(wear_key, *items)
    except Exception as e:
        # WRONGTYPE -> migrate any legacy string to a set, then retry
        try:
            raw = REDIS.get(wear_key)
            legacy = []
            if raw:
                try:
                    legacy = json.loads(raw)
                    if not isinstance(legacy, list):
                        legacy = []
                except Exception:
                    legacy = []
            # replace with a set containing legacy items + current items
            REDIS.delete(wear_key)
            union = list({*legacy, *items})
            if union:
                REDIS.sadd(wear_key, *union)
        except Exception as e2:
            LOG.warning("failed to migrate/write wear history for %s: %s", iso, e2)
    return jsonify({"ok": True, "worn_on": iso, "count": len(items)})


@api2_bp.route("/v2/reset_last_worn", methods=["POST"])
def reset_last_worn():
    """Clear last-worn tracking for all closet items (debug-friendly, non-destructive)."""
    if REDIS is None:
        return jsonify({"ok": False, "error": "redis not configured"}), 503
    items = _closet_items()
    if not items:
        return jsonify({"ok": True, "deleted": 0})
    pipe = REDIS.pipeline()
    for it in items:
        pipe.delete(_lw_key(it["name"]))
    res = pipe.execute()
    deleted = sum(1 for x in res if isinstance(x, int) and x > 0)
    return jsonify({"ok": True, "deleted": deleted})


@api2_bp.route("/v2/history", methods=["GET"])
def history():
    """Return recent day->outfit (items) history.
    Query: ?days=14 (default)
    Response: { "days": [{"date":"YYYY-MM-DD","items":[...]}] }
    """
    days = 14
    try:
        if request.args.get("days"):
            days = max(1, min(90, int(request.args["days"])))
    except Exception:
        pass
    today = _today_local()
    out = []
    if REDIS is None:
        return jsonify({"days": out})
    for i in range(days):
        d = today - timedelta(days=i)
        try:
            key = _wear_key(d)
            # Preferred: read as a set (union of all selections that day)
            items = []
            try:
                members = REDIS.smembers(key)
                if members:
                    items = sorted(members)
                else:
                    # Back-compat: legacy JSON string (single selection stored)
                    raw = REDIS.get(key)
                    if raw:
                        try:
                            parsed = json.loads(raw)
                            if isinstance(parsed, list):
                                items = parsed
                        except Exception:
                            items = []
            except Exception:
                # If SMEMBERS fails due to WRONGTYPE etc., fall back to GET JSON
                raw = REDIS.get(key)
                if raw:
                    try:
                        parsed = json.loads(raw)
                        if isinstance(parsed, list):
                            items = parsed
                    except Exception:
                        items = []
            if items:
                out.append({"date": d.isoformat(), "items": items})
        except Exception as e:
            LOG.warning("history read failed for %s: %s", d, e)
    # newest first
    out.sort(key=lambda x: x["date"], reverse=True)
    return jsonify({"days": out})
