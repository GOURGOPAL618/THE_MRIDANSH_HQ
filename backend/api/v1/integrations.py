from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander
from backend.core.config import settings
from backend.services.external.clients import (
    NASAClient, WeatherClient, AIClient, GitHubClient, FutureAPIClient
)

router = APIRouter()

class AIChatPrompt(BaseModel):
    prompt: str

@router.get("/status", response_model=ApiResponse)
async def get_integrations_status(
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Retrieve external API connections diagnostics metadata.
    Never exposes API keys or masked key segments.
    """
    status_data = {
        "global_mock_mode": settings.GLOBAL_MOCK_MODE,
        "providers": {
            "nasa": {
                "status": "connected" if settings.NASA_API_KEY and not settings.GLOBAL_MOCK_MODE else "mock",
                "key_state": "configured" if settings.NASA_API_KEY else "missing",
                "rate_limit": NASAClient.get_rate_limit_info()
            },
            "weather": {
                "status": "connected" if settings.OPENWEATHER_API_KEY and not settings.GLOBAL_MOCK_MODE else "mock",
                "key_state": "configured" if settings.OPENWEATHER_API_KEY else "missing",
                "rate_limit": WeatherClient.get_rate_limit_info()
            },
            "ai": {
                "status": "connected" if settings.AI_PROVIDER != "mock" and not settings.GLOBAL_MOCK_MODE else "mock",
                "active_provider": settings.AI_PROVIDER,
                "key_state": {
                    "openai": "configured" if settings.OPENAI_API_KEY else "missing",
                    "gemini": "configured" if settings.GOOGLE_API_KEY else "missing"
                },
                "rate_limit": AIClient.get_rate_limit_info()
            },
            "github": {
                "status": "connected" if settings.GITHUB_API_KEY and not settings.GLOBAL_MOCK_MODE else "mock",
                "key_state": "configured" if settings.GITHUB_API_KEY else "missing",
                "repo_target": f"{settings.GITHUB_OWNER}/{settings.GITHUB_REPO}",
                "rate_limit": GitHubClient.get_rate_limit_info()
            },
            "pixxel": FutureAPIClient.get_pixxel_status(),
            "esa": FutureAPIClient.get_esa_status(),
            "isro": FutureAPIClient.get_isro_status()
        }
    }
    return make_response(
        success=True,
        message="External API integrations status checks consolidated.",
        data=status_data
    )


@router.get("/weather", response_model=ApiResponse)
async def get_weather_telemetry(
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Get OpenWeather current weather metrics.
    """
    res = WeatherClient.get_current_weather()
    return make_response(
        success=True,
        message="Weather telemetry synchronized.",
        data=res
    )


@router.get("/nasa", response_model=ApiResponse)
async def get_nasa_telemetry(
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Get NASA picture of the day metadata.
    """
    res = NASAClient.get_apod()
    return make_response(
        success=True,
        message="NASA APOD telemetry retrieved.",
        data=res
    )


@router.post("/ai/chat", response_model=ApiResponse)
async def query_ai_core(
    payload: AIChatPrompt,
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Query JCC AI core with a prompt.
    """
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt text query cannot be empty."
        )

    res = AIClient.get_chat_response(prompt)
    return make_response(
        success=True,
        message="AI core response completed.",
        data=res
    )


@router.get("/github", response_model=ApiResponse)
async def get_git_telemetry(
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Get latest repository commits metrics.
    """
    res = GitHubClient.get_commit_metrics()
    return make_response(
        success=True,
        message="GitHub repository telemetry synchronized.",
        data=res
    )
