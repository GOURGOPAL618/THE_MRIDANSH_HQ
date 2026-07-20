from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from backend.core.security_utils import decode_access_token
from backend.core.logging_config import security_logger
from backend.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)

async def get_current_commander(token: str = Depends(oauth2_scheme)) -> dict:
    """
    FastAPI dependency injection checking current active commander authorization.
    Verifies JWT token validity and logs outcomes to security audit log logs/security.log.
    """
    if not token:
        security_logger.warning("Authorization failure: Missing authentication token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Bearer token is missing."
        )
        
    payload = decode_access_token(token)
    if not payload:
        security_logger.warning("Authorization failure: Token is invalid or expired.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Token signature is invalid or expired."
        )
        
    username = payload.get("sub")
    if not username:
        security_logger.warning("Authorization failure: Subject field 'sub' missing from token payload.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Token payload invalid."
        )
        
    security_logger.info(f"Authorization success: Commander '{username}' session verified.")
    return {
        "id": "commander_mrid1607x",
        "username": username,
        "email": "commander@mridansh.hq",
        "role": "commander"
    }
