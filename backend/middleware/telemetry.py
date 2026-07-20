import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from backend.core.logging_config import system_logger, security_logger

class TelemetryMiddleware(BaseHTTPMiddleware):
    """
    Middleware that records HTTP method, execution path, client IP,
    response status code, and latency in milliseconds.
    Logs standard operations to system_logger, and high-risk operations (e.g., auth, errors) to security_logger.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        
        # Read request metadata
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        
        try:
            response = await call_next(request)
            process_time_ms = (time.perf_counter() - start_time) * 1000
            
            # Formatted log message
            log_message = f"{method} {path} - Status: {response.status_code} - Latency: {process_time_ms:.2f}ms - IP: {client_ip}"
            
            # Classify logs (Security logs vs Standard logs)
            if "/auth" in path or response.status_code in (401, 403, 405):
                # Logs login operations and authorization breaches directly to security log
                security_logger.info(log_message)
            elif response.status_code >= 400:
                # Logs server errors or bad requests as system warnings/errors
                system_logger.warning(log_message)
            else:
                # Standard system diagnostics
                system_logger.info(log_message)
                
            return response
            
        except Exception as e:
            process_time_ms = (time.perf_counter() - start_time) * 1000
            system_logger.error(
                f"EXCEPTION {method} {path} - Error: {str(e)} - Latency: {process_time_ms:.2f}ms - IP: {client_ip}",
                exc_info=True
            )
            raise e
