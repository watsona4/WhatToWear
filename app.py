
import logging
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix
from routes.api import api_bp

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)  # type: ignore

logging.basicConfig(level=logging.DEBUG)
LOG = logging.getLogger(__name__)

# Register Blueprints
app.register_blueprint(api_bp, url_prefix="/api")

@app.get("/health")
def health():
    LOG.debug(f"health(): health check endpoint hit")
    return "OK", 200

if __name__ == "__main__":
    app.run(debug=True)
