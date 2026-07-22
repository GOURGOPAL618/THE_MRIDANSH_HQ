import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, SecurityEvent
from backend.repositories.repos import security_event_repo
from backend.schemas.db_schemas import SecurityEventCreate

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def get_security_events(
    event: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve paginated security threat events with filters.
    Statistics returned inside data.stats match the active query/filter context.
    """
    if limit > 500:
        limit = 500
    if limit < 1:
        limit = 100
        
    query = db.query(SecurityEvent)
    
    # Apply filters
    if event and event.upper() != "ALL":
        query = query.filter(SecurityEvent.event == event)
        
    if risk_level and risk_level.upper() != "ALL":
        query = query.filter(SecurityEvent.risk_level == risk_level)
        
    if search:
        query = query.filter(SecurityEvent.details.contains(search))
        
    # Calculate stats matching the active query/filter context
    total_count = query.count()
    critical_count = query.filter(SecurityEvent.risk_level == "critical").count()
    high_count = query.filter(SecurityEvent.risk_level == "high").count()
    medium_count = query.filter(SecurityEvent.risk_level == "medium").count()
    low_count = query.filter(SecurityEvent.risk_level == "low").count()
    
    # Fetch paginated results
    items = query.order_by(SecurityEvent.timestamp.desc()).offset(skip).limit(limit).all()
    has_more = (skip + len(items)) < total_count
    
    events_data = []
    for item in items:
        events_data.append({
            "id": str(item.id),
            "timestamp": item.timestamp.isoformat(),
            "event": item.event,
            "risk_level": item.risk_level,
            "details": item.details
        })
        
    return make_response(
        success=True,
        message="Security threat events retrieved successfully. Statistics context: active query filters.",
        data={
            "items": events_data,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "skip": skip,
                "has_more": has_more
            },
            "stats": {
                "total_events": total_count,
                "critical_count": critical_count,
                "high_count": high_count,
                "medium_count": medium_count,
                "low_count": low_count
            }
        }
    )


@router.post("", response_model=ApiResponse)
async def dispatch_security_alert(
    payload: SecurityEventCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Append-only security threat event creation (manual threat dispatch).
    Enforces strict input validation on payload fields.
    """
    event_cleaned = payload.event.strip()
    details_cleaned = payload.details.strip()
    risk_cleaned = payload.risk_level.strip().lower()
    
    # 1. Validate empty/whitespace values
    if not event_cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security event tag cannot be empty or whitespace only."
        )
    if not details_cleaned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security alert details cannot be empty or whitespace only."
        )
        
    # 2. Validate length limits
    if len(event_cleaned) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security event tag exceeds maximum length of 50 characters."
        )
    if len(details_cleaned) > 1000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Security alert details exceed maximum length of 1000 characters."
        )
        
    # 3. Validate risk_level value
    allowed_risks = {"low", "medium", "high", "critical"}
    if risk_cleaned not in allowed_risks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid risk_level. Must be one of: {list(allowed_risks)}"
        )
        
    # Build clean verified event object
    payload.event = event_cleaned
    payload.details = details_cleaned
    payload.risk_level = risk_cleaned
    
    item = security_event_repo.create(db, obj_in=payload)
    return make_response(
        success=True,
        message="Manual threat alert dispatch registered to Security Center feed.",
        data={
            "id": str(item.id),
            "timestamp": item.timestamp.isoformat(),
            "event": item.event,
            "risk_level": item.risk_level,
            "details": item.details
        }
    )
