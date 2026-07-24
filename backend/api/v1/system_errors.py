from fastapi import APIRouter, Depends, HTTPException, status
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander
from backend.core.config import settings
from backend.core.exceptions import (
    AetherAuthenticationException,
    AetherAuthorizationException,
    AetherValidationException,
    AetherDatabaseException,
    AetherDatabaseConflictException,
    AetherNetworkException,
    AetherFilesystemException,
    AetherApplicationException
)
import sqlalchemy.exc

router = APIRouter()

@router.get("/trigger")
async def trigger_exception(
    type: str,
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Trigger simulated errors for diagnostics. Feature-flagged to development environments.
    """
    # Enforce safe development-only controls
    if not settings.GLOBAL_MOCK_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Diagnostics error triggers are disabled in production environment."
        )

    t = type.lower().strip()
    if t == "auth":
        raise AetherAuthenticationException("Simulated authentication token failure.")
    elif t == "auth_forbidden":
        raise AetherAuthorizationException("Simulated security clearance failure.")
    elif t == "validation":
        raise AetherValidationException("Simulated request validation failure.")
    elif t == "db":
        raise AetherDatabaseException(
            "Database transaction processing failed.",
            details="OperationalError: sqlite3.OperationalError: database is locked."
        )
    elif t == "conflict":
        # Simulate SQLAlchemy integrity conflict
        raise sqlalchemy.exc.IntegrityError(
            statement="INSERT INTO pinned_result ...",
            params=(),
            orig=Exception("UNIQUE constraint failed: pinned_result.commander_id, item_id, item_type")
        )
    elif t == "network":
        raise AetherNetworkException("Simulated OpenWeather telemetry connection drop.")
    elif t == "filesystem":
        raise AetherFilesystemException("Simulated logs archival write permission failure.")
    elif t == "raw":
        # Raw unhandled exception to test 500 boundary
        return 1 / 0
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown exception trigger type: '{type}'"
        )
