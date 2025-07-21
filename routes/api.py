
import os
import logging
import cachelib  # type: ignore
from flask import Blueprint, request, jsonify

LOG = logging.getLogger(__name__)
LOG.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
formatter = logging.Formatter('[%(asctime)s] %(levelname)s in %(module)s: %(message)s')
handler.setFormatter(formatter)
LOG.addHandler(handler)

CACHE = cachelib.RedisCache(
    host="redis", port=6379, db=0, password=os.environ.get("REDIS_PASSWORD")
)

api_bp = Blueprint("api", __name__)

@api_bp.post("/save_data")
def save_data():
    if not request.is_json:
        LOG.warning("Invalid content type: expected JSON")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json(silent=True)
    if not data or "name" not in data or "data" not in data:
        LOG.warning(f"Missing fields in request data: {data}")
        return jsonify({"error": "Missing 'name' or 'data' field"}), 400

    try:
        LOG.info(f"Saving data for name: {data['name']}")
        CACHE.add(data["name"], data["data"])
        LOG.debug(f"Data saved successfully: {data['name']}")
        return jsonify({"status": "success"}), 200
    except Exception as e:
        LOG.exception("Failed to save data")
        return jsonify({"error": str(e)}), 500

@api_bp.post("/load_data")
def load_data():
    if not request.is_json:
        LOG.warning("Invalid content type: expected JSON")
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json(silent=True)
    if not data or "name" not in data:
        LOG.warning(f"Missing 'name' field in request data: {data}")
        return jsonify({"error": "Missing 'name' field"}), 400

    try:
        LOG.info(f"Loading data for name: {data['name']}")
        val = CACHE.get(data["name"])
        if val is None:
            LOG.info(f"No data found for name: {data['name']}")
            return jsonify({"error": "No data found for that name"}), 404
        LOG.debug(f"Data loaded successfully: {data['name']}")
        return jsonify(val), 200
    except Exception as e:
        LOG.exception("Failed to load data")
        return jsonify({"error": str(e)}), 500
