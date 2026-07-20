from fastapi import APIRouter, Depends
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def system_base(current_commander: Commander = Depends(get_current_commander)):
    """
    Base endpoint placeholder for cockpit systems parameters
    """
    return make_response(
        success=True,
        message="System parameters endpoints base placeholder.",
        data={"cockpit_version": "v1.0.0", "hardware_lock": "nominal"}
    )
