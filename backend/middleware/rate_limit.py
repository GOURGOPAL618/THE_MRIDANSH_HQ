import time
import threading
from typing import Dict, List, Tuple
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from backend.core.config import settings
from backend.core.logging_config import security_logger

class RateLimiter:
    """
    Thread-safe Sliding Window Log Rate Limiter.
    Tracks timestamps of requests per client key.
    """
    def __init__(self):
        self._history: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def check_limit(self, key: str, limit: int, window: int = 60) -> Tuple[bool, int]:
        """
        Check if key exceeds limit in the given window (seconds).
        Returns (is_allowed, retry_after_seconds).
        """
        now = time.time()
        with self._lock:
            history = self._history.setdefault(key, [])
            
            # Remove timestamps outside the sliding window
            cutoff = now - window
            # Find index of first item >= cutoff
            valid_idx = 0
            while valid_idx < len(history) and history[valid_idx] < cutoff:
                valid_idx += 1
            if valid_idx > 0:
                history[:] = history[valid_idx:]

            # Check if limit exceeded
            if len(history) < limit:
                history.append(now)
                return True, 0
                
            # If limit is reached, calculate retry_after
            oldest_timestamp = history[0]
            retry_after = max(1, int(oldest_timestamp + window - now))
            return False, retry_after

    def clear(self):
        """
        Clear rate-limit tracking history. Used to isolate tests.
        """
        with self._lock:
            self._history.clear()

# Global instance of RateLimiter
limiter_instance = RateLimiter()

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Reset limiter if requested by test runner (test environment only)
        if "test_mridansh" in settings.DATABASE_URL or "test" in settings.DATABASE_URL:
            if request.headers.get("X-Test-Reset-Limiter") == "True":
                limiter_instance.clear()
            # Bypass rate limiting in test environment unless explicitly enabled
            if request.headers.get("X-Test-Enable-Limiter") != "True":
                return await call_next(request)

        path = request.url.path
        method = request.method

        # 1. Exempt /health and public liveness checks
        exempt_paths = [
            "/health",
            "/api/v1/system/health/liveness"
        ]
        if path in exempt_paths:
            return await call_next(request)

        # 2. Check if the path is a versioned API path
        if not path.startswith("/api/v1"):
            return await call_next(request)

        # 3. Determine client identity (host IP) checking trusted proxy rules
        client_ip = request.client.host if request.client else "127.0.0.1"
        trusted_proxies = settings.TRUSTED_PROXIES

        # Support test runner dynamic client IP and trusted proxy overrides in test environment
        if "test_mridansh" in settings.DATABASE_URL or "test" in settings.DATABASE_URL:
            test_ip = request.headers.get("X-Test-Client-IP")
            if test_ip:
                client_ip = test_ip
            test_proxies = request.headers.get("X-Test-Trusted-Proxies")
            if test_proxies is not None:
                if test_proxies == "" or test_proxies.lower() == "none":
                    trusted_proxies = []
                else:
                    trusted_proxies = [p.strip() for p in test_proxies.split(",")]
        
        # If the immediate request sender is in the trusted proxies list, check X-Forwarded-For
        if client_ip in trusted_proxies:
            xff = request.headers.get("X-Forwarded-For")
            if xff:
                parts = [p.strip() for p in xff.split(",")]
                if parts:
                    client_ip = parts[0]

        # 4. Map route to rate limiting configuration
        # Format: (limit, window_seconds, category_label)
        limit_config = None
        if path == "/api/v1/auth/login" and method == "POST":
            limit_config = (5, 60, "auth_login")
        elif path == "/api/v1/ai/query" and method == "POST":
            limit_config = (10, 60, "ai_query")
        elif path == "/api/v1/ai/stream" and method == "POST":
            limit_config = (10, 60, "ai_stream")
        else:
            limit_config = (100, 60, "general_api")

        limit, window, category = limit_config
        key = f"{category}:{client_ip}"

        # 5. Evaluate rate limit
        allowed, retry_after = limiter_instance.check_limit(key, limit, window)
        if not allowed:
            # Emit security warning log safely containing no credentials
            security_logger.warning(
                f"[SECURITY_THROTTLE] Rate limit breached for category '{category}' "
                f"by client identity: {client_ip}. Limit: {limit} requests per {window}s. "
                f"Throttled for next {retry_after}s."
            )

            # Return HTTP 429 response matching the JCC response envelope
            content = {
                "success": False,
                "message": "Too many requests. Operation throttled.",
                "data": {
                    "error_code": "RATE_LIMIT_EXCEEDED"
                }
            }
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content=content
            )
            response.headers["Retry-After"] = str(retry_after)
            return response

        return await call_next(request)
