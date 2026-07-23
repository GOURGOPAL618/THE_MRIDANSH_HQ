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


from pydantic import BaseModel, Field
from datetime import datetime, timezone, timedelta
import os
import json
import logging

class LogRetentionRequest(BaseModel):
    days: int = Field(..., ge=1, le=365)

class LogArchiveRequest(BaseModel):
    before_date: str

system_logger = logging.getLogger("system")

@router.post("/retention", response_model=ApiResponse)
async def purge_old_logs(
    payload: LogRetentionRequest,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Purge log entries older than N days. (Auditable operation)
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=payload.days)
    
    # Count matching records
    matching_count = db.query(ActivityLog).filter(ActivityLog.timestamp < cutoff).count()
    
    # Delete them
    db.query(ActivityLog).filter(ActivityLog.timestamp < cutoff).delete(synchronize_session=False)
    db.commit()

    # Log audit entry to database
    system_logger.warning(
        f"Commander '{current_commander.username}' executed logs retention purge. "
        f"Cleared {matching_count} records older than {payload.days} days."
    )

    return make_response(
        success=True,
        message=f"Logs retention purge completed. Cleared {matching_count} old entries.",
        data={"purged_count": matching_count, "retention_days": payload.days}
    )


@router.post("/archive", response_model=ApiResponse)
async def archive_old_logs(
    payload: LogArchiveRequest,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Serialize logs older than a specific date to disk, and purge them from active DB.
    """
    try:
        before_dt = datetime.fromisoformat(payload.before_date.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid before_date format. Must be a valid ISO 8601 string."
        )

    # Fetch matching log entries
    logs_to_archive = db.query(ActivityLog).filter(ActivityLog.timestamp < before_dt).all()
    if not logs_to_archive:
        return make_response(
            success=True,
            message="No records found matching the archive criteria.",
            data={"archived_count": 0, "archive_file": None}
        )

    # Serialize matching entries
    archive_data = []
    for log in logs_to_archive:
        archive_data.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat(),
            "module": log.module,
            "action": log.action,
            "description": log.description,
            "severity": log.severity
        })

    # Ensure archives directory exists
    archive_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "archives")
    os.makedirs(archive_dir, exist_ok=True)

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    archive_filename = f"logs_archive_{timestamp_str}.json"
    archive_path = os.path.join(archive_dir, archive_filename)

    # Write safely to server filesystem
    try:
        with open(archive_path, "w", encoding="utf-8") as f:
            json.dump(archive_data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write archive backup to filesystem: {e}"
        )

    # Delete archived logs from active database
    db.query(ActivityLog).filter(ActivityLog.timestamp < before_dt).delete(synchronize_session=False)
    db.commit()

    # Log audit entry to database
    system_logger.info(
        f"Commander '{current_commander.username}' executed logs archive backup. "
        f"Archived {len(archive_data)} logs before {payload.before_date} to {archive_filename}."
    )

    return make_response(
        success=True,
        message=f"Logs successfully archived and purged. {len(archive_data)} entries moved to backup.",
        data={
            "archived_count": len(archive_data),
            "archive_file": archive_filename
        }
    )
