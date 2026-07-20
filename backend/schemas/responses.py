from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime, UTC
from backend.core.logging_config import request_id_var

T = TypeVar("T")

class ApiResponse(BaseModel, Generic[T]):
    """
    Standardized API Response Model for THE MRIDANSH HQ
    """
    success: bool = Field(..., description="Boolean flag indicating operation outcome status")
    message: str = Field(..., description="Details or diagnostic text description")
    data: Optional[T] = Field(default=None, description="Actual payload data object or null")
    request_id: str = Field(..., description="Correlation request ID for transaction auditing")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of execution")

def make_response(success: bool, message: str, data: Any = None) -> dict:
    """
    Helper function that returns a dictionary matching the standard API response structure.
    Automatically fetches the request_id from ContextVar and builds timestamps.
    """
    # Fetch UTC timezone-aware string representation
    timestamp_str = datetime.now(UTC).isoformat()
    req_id = request_id_var.get()
    
    return {
        "success": success,
        "message": message,
        "data": data,
        "request_id": req_id,
        "timestamp": timestamp_str
    }
