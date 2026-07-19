import logging
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings

# Setup logging config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("../logs/backend.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("mridansh_hq")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS configuration to support localhost, Vercel, and custom domains
if settings.BACKEND_CORS_ORIGINS:
    # Allow wildcard matching for Vercel preview deploys dynamically if needed, 
    # but for baseline config we list the designated hosts.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing THE MRIDANSH Headquarters backend system...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down THE MRIDANSH Headquarters backend system...")

# Simple health check endpoint for deployment monitoring
@app.get("/health", status_code=status.HTTP_200_OK, tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "system": "THE MRIDANSH Headquarters",
        "version": "1.0.0",
        "database": "configured"
    }

@app.get("/")
async def root():
    return {
        "message": "Welcome to THE MRIDANSH Command Headquarters API",
        "docs_url": f"{settings.API_V1_STR}/docs"
    }
