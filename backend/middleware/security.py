from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import os

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # 1. Clickjacking Protection
        response.headers["X-Frame-Options"] = "DENY"
        
        # 2. MIME Sniffing Protection
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # 3. Cross-Site Scripting (XSS) Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # 4. Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # 5. Content Security Policy (CSP)
        # Optimized for API endpoints and Swagger UI (/api/v1/docs, /api/v1/redoc)
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: blob: https://fastapi.tiangolo.com; "
            "connect-src 'self' *; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp
        
        # 6. Strict-Transport-Security (HSTS)
        # Only inject HSTS header if connection is HTTPS to prevent breaking local HTTP dev
        is_https = (
            request.url.scheme == "https" or 
            request.headers.get("x-forwarded-proto") == "https"
        )
        if is_https:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
            
        return response
