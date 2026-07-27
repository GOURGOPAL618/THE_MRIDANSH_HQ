from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander
from backend.services.ai.service import AIService

router = APIRouter()

class AIQueryRequest(BaseModel):
    prompt: str = Field(..., description="The user prompt query")
    mode: str = Field("general", description="Assistant operations mode")
    context: Optional[str] = Field(None, description="Optional payload contextual information")

@router.post("/query", response_model=ApiResponse)
def query_ai_endpoint(
    request: AIQueryRequest,
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Submit a single-shot query to the JCC Cockpit AI Core.
    """
    try:
        res = AIService.query_ai(
            user_prompt=request.prompt,
            mode=request.mode,
            context=request.context
        )
        return make_response(
            success=True,
            message="AI analysis complete.",
            data=res
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI Service failed to compute query."
        )

@router.post("/stream")
def stream_ai_endpoint(
    request: AIQueryRequest,
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Stream tokens from JCC Cockpit AI Core via Server-Sent Events (SSE).
    """
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
    }
    generator = AIService.stream_ai_response(
        user_prompt=request.prompt,
        mode=request.mode,
        context=request.context
    )
    return StreamingResponse(generator, headers=headers)
