import os

from flask import Flask, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix


def create_app():
    prefix = os.getenv("WTW_URL_PREFIX", "/wtw")
    static_dir = os.getenv("STATIC_DIR", "/app/html")

    app = Flask(__name__, static_folder=static_dir, static_url_path=prefix)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    from .routes.api import api_bp
    from .routes.api_v2 import api2_bp
    from .routes.closet_api import closet_bp

    app.register_blueprint(api_bp, url_prefix=f"{prefix}/api")
    app.register_blueprint(api2_bp, url_prefix=f"{prefix}/api")
    app.register_blueprint(closet_bp, url_prefix=f"{prefix}/api")

    @app.get(f"{prefix}/")
    def index():
        return send_from_directory(static_dir, "index.html")

    return app
