from fastapi import APIRouter
from backend.schemas.responses import ApiResponse, make_response

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def engine_base():
    """
    Base endpoint placeholder for engine room diagnostics
    """
    return make_response(
        success=True,
        message="Engine core diagnostics endpoints base placeholder.",
        data={"reactor_state": "idle", "temperature_kelvin": 0.0}
    )
