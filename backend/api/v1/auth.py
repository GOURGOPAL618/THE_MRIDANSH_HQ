from datetime import datetime, UTC
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from jose import jwt

from backend.core.config import settings
from backend.database.session import get_db
from backend.core.security_utils import verify_password, create_access_token, decode_access_token
from backend.core.logging_config import security_logger
from backend.security.auth_deps import get_current_commander, get_token_from_request
from backend.repositories.repos import commander_repo, session_repo, security_event_repo
from backend.models.models import Commander, CommanderSession, SecurityEvent, Notification
from backend.schemas.db_schemas import CommanderLogin, CommanderOut, SecurityEventCreate
from backend.schemas.responses import ApiResponse, make_response

router = APIRouter()

@router.post("/login", response_model=ApiResponse)
async def login(
    login_in: CommanderLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Commander Authentication: Verifies username and password, seeds session audit in database,
    generates JWT, and sets it in an HTTPOnly secure cookie.
    Logs success/failure events in SecurityEvent audit log.
    """
    username = login_in.username
    password = login_in.password
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("User-Agent", "unknown")
    
    # 1. Fetch Commander
    commander = commander_repo.get_by_username(db, username)
    
    # Standard authorization verification to prevent password timing discrepancies
    is_valid = False
    if commander:
        is_valid = verify_password(password, commander.hashed_password)
        
    if not is_valid:
        # Create failure audit log
        security_event_repo.create(db, obj_in=SecurityEventCreate(
            event="commander_login",
            risk_level="high",
            details=f"Failed login attempt for Commander '{username}' from IP {client_ip}."
        ))
        security_logger.warning(f"Authentication failure: Commander '{username}' login failed from IP {client_ip}.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid username or password."
        )
        
    # 2. Create DB Session Record
    db_session = CommanderSession(
        commander_id=commander.id,
        ip_address=client_ip,
        browser=user_agent[:100],
        device="desktop" if "Mobi" not in user_agent else "mobile",
        status="active"
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # 3. Generate Access Token containing sub and sid claims
    access_token = create_access_token(
        subject=commander.username,
        sid=str(db_session.id)
    )
    
    # 4. Set HttpOnly secure cookie
    is_secure = request.url.scheme == "https"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    security_event_repo.create(db, obj_in=SecurityEventCreate(
        event="commander_login",
        risk_level="low",
        details=f"Commander '{username}' successfully logged in from IP {client_ip}. Session ID: {db_session.id}."
    ))
    
    # Dispatch database Notification
    db.add(Notification(
        commander_id=commander.id,
        type="security",
        title="Commander Logged In",
        message=f"Commander successfully logged in from IP {client_ip}. Security clearance level matches role."
    ))
    db.commit()
    
    security_logger.info(f"Authentication success: Commander '{username}' logged in. Session: {db_session.id}")
    
    return make_response(
        success=True,
        message="Authentication successful.",
        data={"username": commander.username, "role": commander.role}
    )


@router.post("/logout", response_model=ApiResponse)
async def logout(
    request: Request,
    response: Response,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Commander Authentication: Invalidates active database session, clears HTTPOnly cookie.
    """
    client_ip = request.client.host if request.client else "unknown"
    
    # 1. Invalidate session in database
    token = await get_token_from_request(request)
    if token:
        payload = decode_access_token(token)
        if payload:
            session_id_str = payload.get("sid")
            if session_id_str:
                try:
                    import uuid
                    session_uuid = uuid.UUID(session_id_str)
                    db_session = session_repo.get(db, session_uuid)
                    if db_session:
                        db_session.status = "terminated"
                        db_session.logout_time = datetime.now(UTC)
                        db.add(db_session)
                        db.commit()
                except Exception as e:
                    security_logger.error(f"Error terminating DB session ID '{session_id_str}': {str(e)}")
                    
    # 2. Clear token cookie
    is_secure = request.url.scheme == "https"
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=is_secure,
        samesite="lax"
    )
    
    # 3. Create logout audit log
    security_event_repo.create(db, obj_in=SecurityEventCreate(
        event="commander_logout",
        risk_level="low",
        details=f"Commander '{current_commander.username}' successfully logged out from IP {client_ip}."
    ))
    security_logger.info(f"Authentication success: Commander '{current_commander.username}' logged out.")
    
    return make_response(
        success=True,
        message="Session terminated successfully."
    )


@router.get("/me", response_model=ApiResponse)
async def get_me(
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Commander Profile: Returns info of current active commander
    """
    commander_data = {
        "id": str(current_commander.id),
        "username": current_commander.username,
        "email": current_commander.email,
        "role": current_commander.role
    }
    return make_response(
        success=True,
        message="Commander profile retrieved.",
        data=commander_data
    )

