from fastapi import FastAPI, status, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

# Import config, split logging system, response helpers and routers
from backend.core.config import settings
from backend.core.logging_config import system_logger, security_logger, request_id_var
from backend.middleware.request_id import RequestIDMiddleware
from backend.middleware.telemetry import TelemetryMiddleware
from backend.middleware.security import SecurityHeadersMiddleware
from backend.middleware.cache import CacheControlMiddleware
from backend.middleware.rate_limit import RateLimitMiddleware
from backend.schemas.responses import ApiResponse, make_response
from backend.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Register request lifecycle middlewares
app.add_middleware(GZipMiddleware, minimum_size=512)
app.add_middleware(TelemetryMiddleware)
app.add_middleware(RequestIDMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CacheControlMiddleware)
app.add_middleware(RateLimitMiddleware)

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
from backend.core.exceptions import AetherException
import sqlalchemy.exc

@app.exception_handler(AetherException)
async def aether_exception_handler(request: Request, exc: AetherException):
    # Log developer-facing trace details to Task 19 logger
    system_logger.error(
        f"[AETHER_EXCEPTION] Code: {exc.error_code} - Msg: {exc.message} - Details: {exc.details}"
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=make_response(
            success=False,
            message=exc.message,
            data={
                "error_code": exc.error_code,
                "request_id": request_id_var.get()
            }
        )
    )

@app.exception_handler(sqlalchemy.exc.SQLAlchemyError)
async def database_exception_handler(request: Request, exc: sqlalchemy.exc.SQLAlchemyError):
    # Extract developer-facing database details
    err_msg = str(exc)
    
    # Check for UNIQUE constraint or integrity error
    if isinstance(exc, sqlalchemy.exc.IntegrityError):
        system_logger.error(f"[DB_INTEGRITY_CONFLICT] {err_msg}")
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=make_response(
                success=False,
                message="Resource state conflict. A record with matching unique parameters already exists.",
                data={
                    "error_code": "DATABASE_CONFLICT",
                    "request_id": request_id_var.get()
                }
            )
        )
        
    system_logger.error(f"[DB_TRANSACTION_FAILURE] {err_msg}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=make_response(
            success=False,
            message="Database transaction processing failed.",
            data={
                "error_code": "DATABASE_ERROR",
                "request_id": request_id_var.get()
            }
        )
    )

@app.exception_handler(OSError)
async def filesystem_exception_handler(request: Request, exc: OSError):
    system_logger.error(f"[FILESYSTEM_FAILURE] {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=make_response(
            success=False,
            message="Filesystem storage access failure.",
            data={
                "error_code": "FILESYSTEM_ERROR",
                "request_id": request_id_var.get()
            }
        )
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    system_logger.error(f"[HTTP_EXCEPTION] Status: {exc.status_code} - Msg: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content=make_response(
            success=False,
            message=exc.detail,
            data={
                "error_code": "HTTP_ERROR",
                "request_id": request_id_var.get()
            }
        )
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    system_logger.warning(f"[VALIDATION_EXCEPTION] Params validation failed: {str(exc.errors())}")
    
    # Sanitize ctx dict in errors to ensure JSON serialization compatibility
    sanitized_errors = []
    for err in exc.errors():
        s_err = dict(err)
        if "ctx" in s_err and isinstance(s_err["ctx"], dict):
            s_err["ctx"] = {k: str(v) for k, v in s_err["ctx"].items()}
        sanitized_errors.append(s_err)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=make_response(
            success=False,
            message="Request parameters validation failed.",
            data={
                "error_code": "VALIDATION_ERROR",
                "errors": sanitized_errors,
                "request_id": request_id_var.get()
            }
        )
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    system_logger.critical(f"CRITICAL: Unhandled server exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=make_response(
            success=False,
            message="Internal server processing error.",
            data={
                "error_code": "UNKNOWN_ERROR",
                "request_id": request_id_var.get()
            }
        )
    )

