import os, json, logging
from flask import Blueprint, request, jsonify

closet_bp = Blueprint("closet", __name__)
LOG = logging.getLogger(__name__)

CLOSET_PATH = os.environ.get("CLOSET_PATH", "./config/closet.json")

def _read_json(path, default):
  try:
    with open(path) as f: return json.load(f)
  except FileNotFoundError:
    return default
  except Exception as e:
    LOG.exception("Failed reading closet: %s", e)
    return default

@closet_bp.route("/v2/closet", methods=["GET"])
def get_closet():
  data = _read_json(CLOSET_PATH, {"items":[]})
  return jsonify(data)

@closet_bp.route("/v2/closet", methods=["PUT"])
def put_closet():
  os.makedirs(os.path.dirname(CLOSET_PATH), exist_ok=True)
  body = request.get_json(force=True) or {}
  items = body.get("items", [])
  with open(CLOSET_PATH, "w") as f:
    json.dump({"items": items}, f, indent=2)
  return jsonify({"ok": True, "count": len(items)})
