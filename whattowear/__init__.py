import os
from flask import Flask, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix

def create_app():
    prefix = os.getenv("WTW_URL_PREFIX", "")
    if prefix and not prefix.startswith("/"):
        prefix = "/" + prefix

    # Serve the existing html/ folder as static
    app = Flask(__name__, static_folder="html", static_url_path=prefix)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

    # Blueprints mounted under /wtw/api/...
    from .routes.api import api_bp
    from .routes.api_v2 import api2_bp
    from .routes.closet_api import closet_bp
    app.register_blueprint(api_bp,   url_prefix=f"{prefix}/api")
    app.register_blueprint(api2_bp,  url_prefix=f"{prefix}/api")
    app.register_blueprint(closet_bp, url_prefix=f"{prefix}/api")

    # Serve index.html at /wtw/ (the static_url_path above exposes /wtw/index.html automatically)
    @app.route(f"{prefix}/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    return app
