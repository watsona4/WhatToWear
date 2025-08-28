from typing import Any, Dict

import requests  # type: ignore

from . import WeatherProvider


class OpenMeteoProvider(WeatherProvider):
    BASE = "https://api.open-meteo.com/v1/forecast"

    def fetch(self) -> Dict[str, Any]:
        params = {
            "latitude": self.lat,
            "longitude": self.lon,
            "hourly": (
                "temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,uv_index"
            ),
            "daily": (
                "temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,wind_speed_10m_max"
            ),
            "current_weather": True,
            "temperature_unit": "fahrenheit",
            "windspeed_unit": "mph",
            "timezone": self.tz,
        }
        r = requests.get(self.BASE, params=params, timeout=10)  # type: ignore
        r.raise_for_status()
        data = r.json()
        current = data.get("current_weather", {})
        daily = data.get("daily", {})

        def first(arr):
            return arr[0] if isinstance(arr, list) and arr else None

        normalized = {
            "current": {
                "temp_f": float(current.get("temperature")) if current else None,
                "wind_mph": float(current.get("windspeed")) if current else None,
            },
            "daily": {
                "high_f": float(first(daily.get("temperature_2m_max"))),
                "low_f": float(first(daily.get("temperature_2m_min"))),
                "uv_index_max": float(first(daily.get("uv_index_max"))),
                "precip_prob_max": (
                    (float(first(daily.get("precipitation_probability_max"))) / 100.0)
                    if first(daily.get("precipitation_probability_max")) is not None
                    else None
                ),
                "wind_mph_max": float(first(daily.get("wind_speed_10m_max"))),
            },
        }
        return normalized
