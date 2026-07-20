from fastapi import APIRouter, Depends
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def radar_base(current_commander: Commander = Depends(get_current_commander)):
    """
    Base endpoint placeholder for Radar target sweep systems
    """
    return make_response(
        success=True,
        message="Radar coordinates scans endpoints base placeholder.",
        data={"scanning_mode": "inactive", "targets_detected": []}
    )
