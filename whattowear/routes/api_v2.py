# Drop-in Flask blueprint
import logging
import os

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
