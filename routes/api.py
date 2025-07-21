
import os
import logging
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
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json(silent=True)
    if not data or "name" not in data or "data" not in data:
        return jsonify({"error": "Missing 'name' or 'data' field"}), 400

    try:
        CACHE.add(data["name"], data["data"])
        return jsonify({"status": "success"}), 200
    except Exception as e:
        LOG.exception("Failed to save data")
        return jsonify({"error": str(e)}), 500

@api_bp.post("/load_data")
def load_data():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json(silent=True)
    if not data or "name" not in data:
        return jsonify({"error": "Missing 'name' field"}), 400

    try:
        val = CACHE.get(data["name"])
        if val is None:
            return jsonify({"error": "No data found for that name"}), 404
        return jsonify(val), 200
    except Exception as e:
        LOG.exception("Failed to load data")
        return jsonify({"error": str(e)}), 500
