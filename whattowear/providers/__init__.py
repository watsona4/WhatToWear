import logging
from typing import Dict, Any

LOG = logging.getLogger(__name__)

class WeatherProvider:
    def __init__(self, lat: float, lon: float, tz: str = "America/New_York"):
        self.lat = lat
        self.lon = lon
        self.tz = tz

    def fetch(self) -> Dict[str, Any]:
        raise NotImplementedError
