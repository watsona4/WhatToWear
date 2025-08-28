import json
import logging
import os
from datetime import date, datetime, timedelta

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
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
REDIS = redis.from_url(REDIS_URL) if REDIS_URL else None


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
    except FileNotFoundError:
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
    if not names:
        return jsonify({"availability": {}, "today": _today_local().isoformat()})

    if REDIS is None:
        # No Redis configured: treat all items as available today
        today = _today_local().isoformat()
        return jsonify({"availability": {n: today for n in names}, "today": today})

    # bulk fetch last worn
    vals = REDIS.mget([_lw_key(n) for n in names])
    name_to_last: dict[str, date | None] = {}
    for n, v in zip(names, vals):
        if not v:
            name_to_last[n] = None
            continue
        try:
            name_to_last[n] = datetime.strptime(v, "%Y-%m-%d").date()
        except Exception:
            name_to_last[n] = None

    # compute next available
    avail: dict[str, str] = {}
    for it in items:
        n = it["name"]
        t = it["type"]
        lw = name_to_last.get(n)
        avail[n] = _available_on_for(t, lw).isoformat()

    return jsonify({"availability": avail, "today": _today_local().isoformat()})


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
    return jsonify({"ok": True, "worn_on": iso, "count": len(items)})
