from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class CacheControlMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        content_type = response.headers.get("content-type", "")
        path = request.url.path
        
        # 1. SSE & Streaming responses must not be cached (always set strict headers)
        if "text/event-stream" in content_type or "multipart/" in content_type:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            return response
            
        # If response already has a Cache-Control header, preserve it for other responses
        if "cache-control" in response.headers:
            return response
            
        # 2. Public health check/liveness checks can be cached for up to 60 seconds
        public_paths = [
            "/health",
            "/api/v1/system/health/liveness"
        ]
        
        if path in public_paths:
            response.headers["Cache-Control"] = "public, max-age=60"
            return response
            
        # 3. All other API endpoints (especially authenticated ones) default to private no-store
        if path.startswith("/api/v1"):
            response.headers["Cache-Control"] = "private, no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            
        return response
