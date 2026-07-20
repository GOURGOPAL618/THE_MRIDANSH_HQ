from fastapi import APIRouter, Depends
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def engine_base(current_commander: Commander = Depends(get_current_commander)):
    """
    Base endpoint placeholder for engine room diagnostics
    """
    return make_response(
        success=True,
        message="Engine core diagnostics endpoints base placeholder.",
        data={"reactor_state": "idle", "temperature_kelvin": 0.0}
    )
