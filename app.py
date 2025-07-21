
import logging
import os
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix
from routes.api import api_bp

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)  # type: ignore

# Configure logging level from environment variable
log_level = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
)
LOG = logging.getLogger(__name__)
LOG.info(f"Logging level set to: {log_level}")

# Register Blueprints
app.register_blueprint(api_bp, url_prefix="/api")

@app.get("/health")
def health():
    LOG.debug("health(): health check endpoint hit")
    return "OK", 200

if __name__ == "__main__":
    app.run(debug=(log_level == "DEBUG"))
