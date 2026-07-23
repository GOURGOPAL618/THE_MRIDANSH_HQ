import os
import json
import urllib.request
import urllib.error
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from backend.core.config import settings
from backend.services.external.retry_helper import retry_on_transient
from backend.services.external.rate_limiter import limiters

logger = logging.getLogger("system")

class BaseClient:
    provider_name = "generic"

    @classmethod
    def get_rate_limit_info(cls) -> Dict[str, int]:
        limiter = limiters.get(cls.provider_name)
        if limiter:
            status = limiter.get_status()
            return {
                "remaining": status["tokens_remaining"],
                "limit": status["max_capacity"]
            }
        return {"remaining": 60, "limit": 60}

    @classmethod
    def check_rate_limit(cls) -> bool:
        limiter = limiters.get(cls.provider_name)
        if limiter:
            return limiter.acquire()
        return True


class NASAClient(BaseClient):
    provider_name = "nasa"

    @classmethod
    @retry_on_transient()
    def get_apod(cls) -> Dict[str, Any]:
        """
        Fetch NASA Astronomy Picture of the Day.
        """
        if settings.GLOBAL_MOCK_MODE or not settings.NASA_API_KEY:
            return cls.get_mock_apod("Mock mode active / NASA key missing")

        if not cls.check_rate_limit():
            return cls.get_mock_apod("Rate limit exceeded")

        url = f"https://api.nasa.gov/planetary/apod?api_key={settings.NASA_API_KEY}"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                return {
                    "source": "nasa",
                    "is_mock": False,
                    "data": {
                        "title": data.get("title", "NASA APOD File"),
                        "url": data.get("url", "https://api.nasa.gov"),
                        "explanation": data.get("explanation", "NASA outer space telescope captured telemetry."),
                        "date": data.get("date", "")
                    },
                    "rate_limit": cls.get_rate_limit_info()
                }
        except Exception as e:
            logger.error(f"NASA APOD API request failed: {e}. Falling back to mock telemetry.")
            return cls.get_mock_apod(f"API Error: {str(e)}")

    @classmethod
    def get_mock_apod(cls, reason: str) -> Dict[str, Any]:
        return {
            "source": "mock",
            "is_mock": True,
            "data": {
                "title": "AETHER Nebula Cluster Scan (Simulated)",
                "url": "/images/mock-apod.jpg", # Placeholder route
                "explanation": f"Synthetic JCC radar scan tracking high-density molecular elements inside the central Crab Nebula. Reason: {reason}",
                "date": datetime.now(timezone.utc).date().isoformat()
            },
            "rate_limit": cls.get_rate_limit_info()
        }


class WeatherClient(BaseClient):
    provider_name = "weather"

    @classmethod
    @retry_on_transient()
    def get_current_weather(cls) -> Dict[str, Any]:
        """
        Fetch OpenWeather current weather parameters for JCC Headquarters base.
        """
        if settings.GLOBAL_MOCK_MODE or not settings.OPENWEATHER_API_KEY:
            return cls.get_mock_weather("Mock mode active / OpenWeather key missing")

        if not cls.check_rate_limit():
            return cls.get_mock_weather("Rate limit exceeded")

        # JCC headquarters coordinates: 21.03 lat, 80.24 lon
        url = f"https://api.openweathermap.org/data/2.5/weather?lat=21.03&lon=80.24&appid={settings.OPENWEATHER_API_KEY}&units=metric"
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                main = data.get("main", {})
                wind = data.get("wind", {})
                return {
                    "source": "openweather",
                    "is_mock": False,
                    "data": {
                        "temperature": main.get("temp", 25.0),
                        "humidity": main.get("humidity", 60),
                        "wind_speed": wind.get("speed", 3.0),
                        "pressure": main.get("pressure", 1013),
                        "weather_main": data.get("weather", [{}])[0].get("main", "Clear"),
                        "description": data.get("weather", [{}])[0].get("description", "clear sky")
                    },
                    "rate_limit": cls.get_rate_limit_info()
                }
        except Exception as e:
            logger.error(f"OpenWeather API request failed: {e}. Falling back to mock.")
            return cls.get_mock_weather(f"API Error: {str(e)}")

    @classmethod
    def get_mock_weather(cls, reason: str) -> Dict[str, Any]:
        return {
            "source": "mock",
            "is_mock": True,
            "data": {
                "temperature": 24.5,
                "humidity": 65,
                "wind_speed": 3.4,
                "pressure": 1012,
                "weather_main": "Nominal",
                "description": f"Standard mock cockpit temperature environment sweep. Reason: {reason}"
            },
            "rate_limit": cls.get_rate_limit_info()
        }


class AIClient(BaseClient):
    provider_name = "ai"

    @classmethod
    @retry_on_transient()
    def get_chat_response(cls, prompt: str) -> Dict[str, Any]:
        """
        Query Gemini or OpenAI API depending on settings configuration.
        """
        if settings.GLOBAL_MOCK_MODE or settings.AI_PROVIDER == "mock":
            return cls.get_mock_ai(prompt, "Mock provider configured")

        if not cls.check_rate_limit():
            return cls.get_mock_ai(prompt, "Rate limit exceeded")

        if settings.AI_PROVIDER == "gemini":
            if not settings.GOOGLE_API_KEY:
                return cls.get_mock_ai(prompt, "Google API Key missing")
            return cls.query_gemini(prompt)

        elif settings.AI_PROVIDER == "openai":
            if not settings.OPENAI_API_KEY:
                return cls.get_mock_ai(prompt, "OpenAI API Key missing")
            return cls.query_openai(prompt)

        return cls.get_mock_ai(prompt, "AI provider not configured")

    @classmethod
    def query_gemini(cls, prompt: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={settings.GOOGLE_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [{"text": f"You are AETHER JCC Cockpit AI. Keep response under 100 words. Prompt: {prompt}"}]
                }
            ]
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                res_data = json.loads(response.read().decode())
                text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return {
                    "source": "gemini",
                    "is_mock": False,
                    "data": {"response": text.strip()},
                    "rate_limit": cls.get_rate_limit_info()
                }
        except Exception as e:
            logger.error(f"Gemini API request failed: {e}")
            return cls.get_mock_ai(prompt, f"Gemini Error: {str(e)}")

    @classmethod
    def query_openai(cls, prompt: str) -> Dict[str, Any]:
        url = "https://api.openai.com/v1/chat/completions"
        payload = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "You are AETHER JCC Cockpit AI. Keep response short (under 100 words)."},
                {"role": "user", "content": prompt}
            ]
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=8) as response:
                res_data = json.loads(response.read().decode())
                text = res_data["choices"][0]["message"]["content"]
                return {
                    "source": "openai",
                    "is_mock": False,
                    "data": {"response": text.strip()},
                    "rate_limit": cls.get_rate_limit_info()
                }
        except Exception as e:
            logger.error(f"OpenAI API request failed: {e}")
            return cls.get_mock_ai(prompt, f"OpenAI Error: {str(e)}")

    @classmethod
    def get_mock_ai(cls, prompt: str, reason: str) -> Dict[str, Any]:
        resp = f"[JCC AI Core Simulation - {reason}]: Received prompt '{prompt}'. AI analysis confirms all coordinates stable. Propulsion core, thermal limits, and fuel locks are operating within nominal specs."
        return {
            "source": "mock",
            "is_mock": True,
            "data": {"response": resp},
            "rate_limit": cls.get_rate_limit_info()
        }


class GitHubClient(BaseClient):
    provider_name = "github"

    @classmethod
    @retry_on_transient()
    def get_commit_metrics(cls) -> Dict[str, Any]:
        """
        Fetch latest commits from GitHub repository.
        """
        if settings.GLOBAL_MOCK_MODE:
            return cls.get_mock_commits("Mock mode active")

        if not cls.check_rate_limit():
            return cls.get_mock_commits("Rate limit exceeded")

        url = f"https://api.github.com/repos/{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}/commits?per_page=5"
        headers = {
            "User-Agent": "AETHER-Cockpit-App"
        }
        if settings.GITHUB_API_KEY:
            headers["Authorization"] = f"token {settings.GITHUB_API_KEY}"

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                commits = []
                for item in data:
                    commits.append({
                        "sha": item.get("sha", "")[:7],
                        "message": item.get("commit", {}).get("message", "Commit message"),
                        "author": item.get("commit", {}).get("author", {}).get("name", "gg-m"),
                        "date": item.get("commit", {}).get("author", {}).get("date", "")
                    })
                return {
                    "source": "github",
                    "is_mock": False,
                    "data": {"commits": commits},
                    "rate_limit": cls.get_rate_limit_info()
                }
        except Exception as e:
            logger.error(f"GitHub API request failed: {e}")
            return cls.get_mock_commits(f"API Error: {str(e)}")

    @classmethod
    def get_mock_commits(cls, reason: str) -> Dict[str, Any]:
        mock_commits = [
            {
                "sha": "9466aed",
                "message": f"Task 17 Complete: Universal Search Center indices. Reason: {reason}",
                "author": "commander",
                "date": datetime.now(timezone.utc).isoformat()
            },
            {
                "sha": "e642389",
                "message": "Task 16 Complete: Central Notification feeds center",
                "author": "commander",
                "date": datetime.now(timezone.utc).isoformat()
            },
            {
                "sha": "4377579",
                "message": "Task 15 Complete: Preference vault sliders",
                "author": "commander",
                "date": datetime.now(timezone.utc).isoformat()
            }
        ]
        return {
            "source": "mock",
            "is_mock": True,
            "data": {"commits": mock_commits},
            "rate_limit": cls.get_rate_limit_info()
        }


class FutureAPIClient:
    """
    Standby clients for future telemetry providers.
    """
    @staticmethod
    def get_pixxel_status() -> Dict[str, Any]:
        return {
            "source": "pixxel",
            "is_mock": True,
            "status": "standby",
            "message": "Integration pending Pixxel hyperspectral payload release."
        }

    @staticmethod
    def get_esa_status() -> Dict[str, Any]:
        return {
            "source": "esa",
            "is_mock": True,
            "status": "standby",
            "message": "Copernicus Sentinels catalog hooks ready. Integration pending clearance."
        }

    @staticmethod
    def get_isro_status() -> Dict[str, Any]:
        return {
            "source": "isro",
            "is_mock": True,
            "status": "standby",
            "message": "Cartosat high-resolution imagery stubs initialized. Awaiting API endpoints."
        }
