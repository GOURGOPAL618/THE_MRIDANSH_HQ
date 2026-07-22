from fastapi import APIRouter
from backend.api.v1.auth import router as auth_router
from backend.api.v1.system import router as system_router
from backend.api.v1.engine import router as engine_router
from backend.api.v1.earth import router as earth_router
from backend.api.v1.radar import router as radar_router
from backend.api.v1.research import router as research_router
from backend.api.v1.logs import router as logs_router
from backend.api.v1.datasets import router as datasets_router
from backend.api.v1.experiments import router as experiments_router
from backend.api.v1.security import router as security_router

api_router = APIRouter()

# Mount all feature placeholder sub-routers
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(system_router, prefix="/system", tags=["system"])
api_router.include_router(engine_router, prefix="/engine", tags=["engine"])
api_router.include_router(earth_router, prefix="/earth", tags=["earth"])
api_router.include_router(radar_router, prefix="/radar", tags=["radar"])
api_router.include_router(research_router, prefix="/research", tags=["research"])
api_router.include_router(logs_router, prefix="/logs", tags=["logs"])
api_router.include_router(datasets_router, prefix="/datasets", tags=["datasets"])
api_router.include_router(experiments_router, prefix="/experiments", tags=["experiments"])
api_router.include_router(security_router, prefix="/security", tags=["security"])
