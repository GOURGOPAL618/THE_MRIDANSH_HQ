from fastapi import APIRouter
from backend.schemas.responses import ApiResponse, make_response

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def earth_base():
    """
    Base endpoint placeholder for Earth operations telemetry
    """
    return make_response(
        success=True,
        message="Earth operations coordinates endpoints base placeholder.",
        data={"orbital_tracking": "active", "coordinates_cached": 0}
    )
