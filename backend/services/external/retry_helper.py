import time
import logging
from functools import wraps
from typing import Callable, Any
import urllib.error
import http.client

logger = logging.getLogger("system")

def retry_on_transient(max_retries: int = 3, initial_delay: float = 1.0):
    """
    Decorator to retry only transient failures (timeouts, connection issues, HTTP 429, HTTP 5xx).
    Does NOT retry 4xx auth/validation errors.
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            delay = initial_delay
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    is_transient = False
                    status_code = None

                    # Check for HTTP errors
                    if isinstance(e, urllib.error.HTTPError):
                        status_code = e.code
                    elif hasattr(e, "response") and hasattr(e.response, "status_code"):
                        status_code = e.response.status_code
                    
                    if status_code is not None:
                        # 429 (Too Many Requests) or 5xx (Server Error)
                        if status_code == 429 or 500 <= status_code <= 599:
                            is_transient = True
                    else:
                        # Timeout, name resolution, or connection failures
                        err_str = str(e).lower()
                        if (
                            "timeout" in err_str or
                            "timed out" in err_str or
                            "connection" in err_str or
                            "refused" in err_str or
                            isinstance(e, (urllib.error.URLError, TimeoutError, ConnectionError, http.client.HTTPException))
                        ):
                            is_transient = True

                    if not is_transient or attempt == max_retries:
                        break
                    
                    logger.warning(
                        f"Transient failure in '{func.__name__}' (attempt {attempt + 1}/{max_retries + 1}). "
                        f"Status: {status_code or 'Network Error'}. Retrying in {delay:.2f}s..."
                    )
                    time.sleep(delay)
                    delay *= 2.0
            
            # If we exhausted retries or hit a non-transient exception, raise it
            raise last_exception
            
        return wrapper
    return decorator
