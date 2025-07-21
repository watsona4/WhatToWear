import logging
import os
import os.path

import cachelib  # type: ignore
from flask import Flask, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix

CACHE = cachelib.RedisCache(
    host="redis", port=6379, db=0, password=os.environ.get("REDIS_PASSWORD")
)

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)  # type: ignore

logging.basicConfig(level=logging.DEBUG)
LOG = logging.getLogger(__name__)


@app.post("/save_data")
def save_data():
    LOG.debug(f"save_data(): {request=}")
    data = request.get_json()
    LOG.debug(f"save_data(): {data=}")
    CACHE.add(data["name"], data["data"])
    return "OK", 200


@app.post("/load_data")
def load_data():
    LOG.debug(f"load_data(): {request=}")
    data = request.get_json()
    LOG.debug(f"load_data(): {data=}")
    val = CACHE.get(data["name"])
    LOG.debug(f"load_data(): {val=}")
    return jsonify(val)


if __name__ == "__main__":
    app.run(debug=True)
