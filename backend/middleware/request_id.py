import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from backend.core.logging_config import request_id_var

class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Middleware that ensures every incoming request has a unique Request ID.
    If the client sends 'X-Request-ID' header, it uses it; otherwise, it generates a UUID.
    Saves the ID in ContextVar for logging and returns it in response headers.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        
        # Set context variable for thread-safe access in logging
        token = request_id_var.set(request_id)
        
        try:
            response = await call_next(request)
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            # Reset ContextVar to prevent leakages
            request_id_var.reset(token)
