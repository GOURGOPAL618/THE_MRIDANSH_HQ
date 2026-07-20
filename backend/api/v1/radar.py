from fastapi import APIRouter
from backend.schemas.responses import ApiResponse, make_response

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def radar_base():
    """
    Base endpoint placeholder for Radar target sweep systems
    """
    return make_response(
        success=True,
        message="Radar coordinates scans endpoints base placeholder.",
        data={"scanning_mode": "inactive", "targets_detected": []}
    )
