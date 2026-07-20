from fastapi import APIRouter
from backend.schemas.responses import ApiResponse, make_response

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def auth_base():
    """
    Base endpoint placeholder for authentication controls
    """
    return make_response(
        success=True,
        message="Authentication endpoints base placeholder.",
        data={"status": "inactive", "methods_available": ["password", "token"]}
    )
