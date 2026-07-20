from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.core.security_utils import decode_access_token
from backend.core.logging_config import security_logger
from backend.core.config import settings
from backend.database.session import get_db
from backend.repositories.repos import commander_repo, session_repo
from backend.models.models import Commander

async def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract token from Authorization header (Bearer) or HTTPOnly access_token cookie
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
        
    return request.cookies.get("access_token")

async def get_current_commander(
    request: Request,
    db: Session = Depends(get_db)
) -> Commander:
    """
    FastAPI dependency injection checking current active commander authorization.
    Verifies JWT token signature, expiration, Commander existence, and active session status.
    """
    token = await get_token_from_request(request)
    if not token:
        security_logger.warning("Authorization failure: Missing authentication token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Bearer token or cookie is missing."
        )
        
    payload = decode_access_token(token)
    if not payload:
        security_logger.warning("Authorization failure: Token is invalid or expired.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Token signature is invalid or expired."
        )
        
    username = payload.get("sub")
    session_id_str = payload.get("sid")
    
    if not username or not session_id_str:
        security_logger.warning("Authorization failure: Required claims 'sub' or 'sid' missing from payload.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Token payload invalid."
        )
        
    # 1. Verify Commander exists in database
    commander = commander_repo.get_by_username(db, username)
    if not commander:
        security_logger.warning(f"Authorization failure: Commander profile '{username}' not found in database.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Commander profile not found."
        )
        
    # 2. Verify Session exists and is active
    try:
        import uuid
        session_uuid = uuid.UUID(session_id_str)
        db_session = session_repo.get(db, session_uuid)
        if not db_session or db_session.status != "active":
            security_logger.warning(f"Authorization failure: Commander session '{session_id_str}' is revoked or inactive.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed: Session is inactive or terminated."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        security_logger.warning(f"Authorization failure: Invalid session ID format '{session_id_str}'. Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid session identifier."
        )
        
    security_logger.info(f"Authorization success: Commander '{username}' session '{session_id_str}' verified.")
    return commander

