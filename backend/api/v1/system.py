from fastapi import APIRouter
from backend.schemas.responses import ApiResponse, make_response

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def system_base():
    """
    Base endpoint placeholder for cockpit systems parameters
    """
    return make_response(
        success=True,
        message="System parameters endpoints base placeholder.",
        data={"cockpit_version": "v1.0.0", "hardware_lock": "nominal"}
    )
