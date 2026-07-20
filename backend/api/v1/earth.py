from fastapi import APIRouter, Depends
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def earth_base(current_commander: Commander = Depends(get_current_commander)):
    """
    Base endpoint placeholder for Earth operations telemetry
    """
    return make_response(
        success=True,
        message="Earth operations coordinates endpoints base placeholder.",
        data={"orbital_tracking": "active", "coordinates_cached": 0}
    )
