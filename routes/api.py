
import os
import logging
import os.path
import cachelib  # type: ignore
from flask import Blueprint, request, jsonify

LOG = logging.getLogger(__name__)
CACHE = cachelib.RedisCache(
    host="redis", port=6379, db=0, password=os.environ.get("REDIS_PASSWORD")
)

api_bp = Blueprint("api", __name__)

@api_bp.post("/save_data")
def save_data():
    if not request.is_json:
        return jsonify({"error": "Invalid content type"}), 400
    data = request.get_json(silent=True)
    if not data or "name" not in data or "data" not in data:
        return jsonify({"error": "Missing 'name' or 'data' field"}), 400
    LOG.debug(f"save_data(): {data=}")
    success = CACHE.add(data["name"], data["data"])
    if not success:
        return jsonify({"warning": "Data already exists for this key"}), 409
    return "OK", 200

@api_bp.post("/load_data")
def load_data():
    if not request.is_json:
        return jsonify({"error": "Invalid content type"}), 400
    data = request.get_json(silent=True)
    if not data or "name" not in data:
        return jsonify({"error": "Missing 'name' field"}), 400
    LOG.debug(f"load_data(): {data=}")
    val = CACHE.get(data["name"])
    if val is None:
        return jsonify({"error": "No data found for this key"}), 404
    return jsonify(val)
