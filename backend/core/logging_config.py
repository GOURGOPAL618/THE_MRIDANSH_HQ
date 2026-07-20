import os
import logging
from logging.handlers import RotatingFileHandler
from contextvars import ContextVar

# ContextVar to store request IDs dynamically across async tasks/threads
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

class RequestIDFilter(logging.Filter):
    """
    Logging filter that injects the current request ID from ContextVar into records
    """
    def filter(self, record):
        record.request_id = request_id_var.get()
        return True

def setup_logging():
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
    os.makedirs(log_dir, exist_ok=True)

    # File paths
    backend_log_path = os.path.join(log_dir, "backend.log")
    security_log_path = os.path.join(log_dir, "security.log")

    # Logging format: [TIMESTAMP] [LEVEL] [REQUEST_ID] [LOGGER/MODULE] message
    log_format = "[%(asctime)s] [%(levelname)s] [%(request_id)s] [%(name)s] %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    formatter = logging.Formatter(log_format, datefmt=date_format)

    # Request ID filter instance
    req_filter = RequestIDFilter()

    # 1. Root/Backend Logger Configuration
    root_logger = logging.getLogger()
    # Remove existing handlers to avoid duplicates during hot reloading
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    root_logger.setLevel(logging.INFO)

    # Console Handler (STDOUT)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.addFilter(req_filter)
    root_logger.addHandler(console_handler)

    # Backend File Handler (Standard Logs)
    backend_file_handler = RotatingFileHandler(
        backend_log_path, maxBytes=10*1024*1024, backupCount=5, encoding="utf-8"
    )
    backend_file_handler.setFormatter(formatter)
    backend_file_handler.addFilter(req_filter)
    root_logger.addHandler(backend_file_handler)

    # 2. Security Logger Configuration (Specific for auth, logins, overrides)
    security_logger = logging.getLogger("security")
    # Clear existing handlers
    for handler in security_logger.handlers[:]:
        security_logger.removeHandler(handler)
        
    security_logger.setLevel(logging.INFO)
    # Prevent propagation to root logger to keep security.log separated
    security_logger.propagate = False

    # Security Console Handler
    sec_console_handler = logging.StreamHandler()
    sec_console_handler.setFormatter(formatter)
    sec_console_handler.addFilter(req_filter)
    security_logger.addHandler(sec_console_handler)

    # Security File Handler
    security_file_handler = RotatingFileHandler(
        security_log_path, maxBytes=10*1024*1024, backupCount=10, encoding="utf-8"
    )
    security_file_handler.setFormatter(formatter)
    security_file_handler.addFilter(req_filter)
    security_logger.addHandler(security_file_handler)

    logging.getLogger("uvicorn.access").propagate = False
    logging.getLogger("uvicorn.error").propagate = False

    # Add uvicorn logs to backend.log
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.addHandler(backend_file_handler)
    uvicorn_error = logging.getLogger("uvicorn.error")
    uvicorn_error.addHandler(backend_file_handler)

    logging.info("Split logging system successfully initialized.")

# Expose helper imports
setup_logging()
system_logger = logging.getLogger("system")
security_logger = logging.getLogger("security")
