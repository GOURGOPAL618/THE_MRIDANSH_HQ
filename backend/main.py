from fastapi import FastAPI, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Import config, split logging system, response helpers and routers
from backend.core.config import settings
from backend.core.logging_config import system_logger, security_logger
from backend.middleware.request_id import RequestIDMiddleware
from backend.middleware.telemetry import TelemetryMiddleware
from backend.schemas.responses import ApiResponse, make_response
from backend.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Register request lifecycle middlewares
app.add_middleware(TelemetryMiddleware)
app.add_middleware(RequestIDMiddleware)

# CORS configuration to support localhost, Vercel, and custom domains (registered last to execute first in ASGI pipeline)
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount versioned API routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    import logging
    from backend.core.logging_config import DatabaseLoggingHandler, security_logger
    
    root_logger = logging.getLogger()
    if not any(isinstance(h, DatabaseLoggingHandler) for h in root_logger.handlers):
        db_handler = DatabaseLoggingHandler()
        db_handler.setLevel(logging.INFO)
        root_logger.addHandler(db_handler)
        
    if not any(isinstance(h, DatabaseLoggingHandler) for h in security_logger.handlers):
        sec_db_handler = DatabaseLoggingHandler()
        sec_db_handler.setLevel(logging.INFO)
        security_logger.addHandler(sec_db_handler)

    system_logger.info("Initializing THE MRIDANSH Headquarters JCC backend system...")
    
    # Auto-seed the Single Commander record if missing
    from backend.database.session import SessionLocal
    from backend.repositories.repos import commander_repo
    from backend.core.security_utils import get_password_hash
    from backend.models.models import Commander, Settings as SettingsModel
    
    db = SessionLocal()
    try:
        commander = commander_repo.get_by_username(db, settings.COMMANDER_USERNAME)
        if not commander:
            system_logger.info(f"Seeding single Commander '{settings.COMMANDER_USERNAME}' into database...")
            
            # Hash password only once
            hashed_pw = get_password_hash(settings.COMMANDER_PASSWORD)
            
            # Create Commander record directly
            new_commander = Commander(
                username=settings.COMMANDER_USERNAME,
                email="commander@mridansh.hq",
                hashed_password=hashed_pw,
                role="commander"
            )
            db.add(new_commander)
            db.commit()
            db.refresh(new_commander)
            
            # Also seed default settings for this Commander
            default_settings = SettingsModel(
                commander_id=new_commander.id,
                theme="default",
                volume=0.5,
                is_muted=False,
                notifications_enabled=True,
                performance_mode="quality"
            )
            db.add(default_settings)
            db.commit()
            system_logger.info(f"Successfully seeded Commander '{settings.COMMANDER_USERNAME}' and default cockpit configurations.")
    except Exception as e:
        system_logger.error(f"Failed to seed Commander record on startup: {str(e)}", exc_info=True)
    finally:
        db.close()

@app.on_event("shutdown")
async def shutdown_event():
    system_logger.info("Shutting down THE MRIDANSH Headquarters JCC backend system...")

# Health check and root endpoints matching standard API response structures
@app.get("/health", response_model=ApiResponse, tags=["System"])
async def health_check():
    """
    Standardized JCC system health check monitor
    """
    return make_response(
        success=True,
        message="System state nominal.",
        data={
            "status": "healthy",
            "version": "1.0.0",
            "database": "configured"
        }
    )

@app.get("/", response_model=ApiResponse, tags=["System"])
async def root():
    """
    Base directory router metadata
    """
    return make_response(
        success=True,
        message="Welcome to THE MRIDANSH Command Headquarters API.",
        data={"docs_url": f"{settings.API_V1_STR}/docs"}
    )

# Standardized Global Exception Handlers mapping success=False response schema
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=make_response(
            success=False,
            message=exc.detail,
            data=None
        )
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=make_response(
            success=False,
            message="Request parameters validation failed.",
            data={"errors": exc.errors()}
        )
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    system_logger.error(f"CRITICAL: Unhandled server exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=make_response(
            success=False,
            message="Internal server processing error.",
            data=None
        )
    )

