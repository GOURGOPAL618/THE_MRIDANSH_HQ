import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, ActivityLog
from backend.repositories.repos import log_repo
from backend.schemas.db_schemas import ActivityLogCreate

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def get_activity_logs(
    module: Optional[str] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve chronologically sorted activity logs with filters and pagination metadata.
    """
    # Enforce limit capping
    if limit > 500:
        limit = 500
    if limit < 1:
        limit = 100
        
    query = db.query(ActivityLog)
    
    # Apply filters
    if module and module.upper() != "ALL":
        query = query.filter(ActivityLog.module == module)
        
    if severity and severity.upper() != "ALL":
        query = query.filter(ActivityLog.severity == severity)
        
    if search:
        query = query.filter(ActivityLog.description.contains(search))
        
    # Calculate stats over the entire filtered query (pre-pagination)
    total_count = query.count()
    warning_count = query.filter(ActivityLog.severity == "warning").count()
    error_count = query.filter(ActivityLog.severity == "error").count()
    security_count = query.filter(ActivityLog.severity == "security").count()
    
    # Apply sorting, offset, and limit
    items = query.order_by(ActivityLog.timestamp.desc()).offset(skip).limit(limit).all()
    has_more = (skip + len(items)) < total_count
    
    logs_data = []
    for item in items:
        logs_data.append({
            "id": str(item.id),
            "timestamp": item.timestamp.isoformat(),
            "module": item.module,
            "action": item.action,
            "description": item.description,
            "severity": item.severity
        })
        
    return make_response(
        success=True,
        message="Activity logs retrieved successfully.",
        data={
            "items": logs_data,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "skip": skip,
                "has_more": has_more
            },
            "stats": {
                "total_records": total_count,
                "warning_count": warning_count,
                "error_count": error_count,
                "security_count": security_count
            }
        }
    )


@router.post("", response_model=ApiResponse)
async def create_log_entry(
    payload: ActivityLogCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Register a new custom activity log entry (append-only operational audit).
    """
    item = log_repo.create(db, obj_in=payload)
    return make_response(
        success=True,
        message="Custom activity log registered to audit feed.",
        data={
            "id": str(item.id),
            "timestamp": item.timestamp.isoformat(),
            "module": item.module,
            "action": item.action,
            "description": item.description,
            "severity": item.severity
        }
    )
