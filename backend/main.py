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

# CORS configuration to support localhost, Vercel, and custom domains
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin).rstrip("/") for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register request lifecycle middlewares
app.add_middleware(TelemetryMiddleware)
app.add_middleware(RequestIDMiddleware)

# Mount versioned API routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    system_logger.info("Initializing THE MRIDANSH Headquarters JCC backend system...")

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

