import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, Notification
from backend.repositories.repos import notification_repo
from backend.schemas.db_schemas import NotificationCreate

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def get_notifications(
    type: Optional[str] = None,
    is_read: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve paginated notifications for the authenticated Commander.
    Filters by type, is_read, and search keyword.
    """
    if limit > 500:
        limit = 500
    if limit < 1:
        limit = 100

    query = db.query(Notification).filter(Notification.commander_id == current_commander.id)

    # Apply filters
    if type and type.upper() != "ALL":
        query = query.filter(Notification.type == type.lower())

    if is_read is not None:
        query = query.filter(Notification.is_read == is_read)

    if search:
        query = query.filter(
            (Notification.title.contains(search)) | (Notification.message.contains(search))
        )

    # Calculate filtered stats over matching query context
    total_count = query.count()
    unread_count = query.filter(Notification.is_read == False).count()
    warning_count = query.filter(Notification.type == "warning").count()
    critical_count = query.filter(Notification.type == "critical").count()

    # Fetch paginated results
    items = query.order_by(Notification.timestamp.desc()).offset(skip).limit(limit).all()
    has_more = (skip + len(items)) < total_count

    notifications_data = []
    for item in items:
        notifications_data.append({
            "id": str(item.id),
            "commander_id": str(item.commander_id),
            "timestamp": item.timestamp.isoformat(),
            "type": item.type,
            "title": item.title,
            "message": item.message,
            "is_read": item.is_read
        })

    return make_response(
        success=True,
        message="Notifications retrieved successfully.",
        data={
            "items": notifications_data,
            "pagination": {
                "total": total_count,
                "limit": limit,
                "skip": skip,
                "has_more": has_more
            },
            "stats": {
                "total_alerts": total_count,
                "unread_count": unread_count,
                "warning_count": warning_count,
                "critical_count": critical_count
            }
        }
    )


@router.get("/unread-count", response_model=ApiResponse)
async def get_unread_count(
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve only the unread notifications count integer.
    """
    count = db.query(Notification).filter(
        Notification.commander_id == current_commander.id,
        Notification.is_read == False
    ).count()

    return make_response(
        success=True,
        message="Unread notification count calculated.",
        data={"count": count}
    )


@router.post("", response_model=ApiResponse)
async def dispatch_notification(
    payload: NotificationCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Create a new database notification log mapping commander ownership.
    """
    # Create notification with commander_id
    db_obj = Notification(
        commander_id=current_commander.id,
        type=payload.type.strip().lower(),
        title=payload.title.strip(),
        message=payload.message.strip(),
        is_read=False
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)

    return make_response(
        success=True,
        message="Notification successfully dispatched to database.",
        data={
            "id": str(db_obj.id),
            "commander_id": str(db_obj.commander_id),
            "timestamp": db_obj.timestamp.isoformat(),
            "type": db_obj.type,
            "title": db_obj.title,
            "message": db_obj.message,
            "is_read": db_obj.is_read
        }
    )


@router.put("/{id}/read", response_model=ApiResponse)
async def mark_notification_read(
    id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Mark a single notification as read, validating commander ownership.
    """
    item = db.query(Notification).filter(
        Notification.id == id,
        Notification.commander_id == current_commander.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification record not found or access denied."
        )

    item.is_read = True
    db.commit()
    db.refresh(item)

    return make_response(
        success=True,
        message="Notification marked as read.",
        data={
            "id": str(item.id),
            "commander_id": str(item.commander_id),
            "timestamp": item.timestamp.isoformat(),
            "type": item.type,
            "title": item.title,
            "message": item.message,
            "is_read": item.is_read
        }
    )


@router.put("/read-all", response_model=ApiResponse)
async def mark_all_read(
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Mark all unread notifications of the commander as read.
    """
    db.query(Notification).filter(
        Notification.commander_id == current_commander.id,
        Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)

    db.commit()
    return make_response(
        success=True,
        message="All notifications marked as read."
    )


@router.delete("/{id}", response_model=ApiResponse)
async def delete_notification(
    id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Delete a single notification log, validating commander ownership.
    """
    item = db.query(Notification).filter(
        Notification.id == id,
        Notification.commander_id == current_commander.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification record not found or access denied."
        )

    db.delete(item)
    db.commit()

    return make_response(
        success=True,
        message="Notification successfully deleted."
    )


@router.delete("", response_model=ApiResponse)
async def clear_all_notifications(
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Clear/delete all notification records for the active Commander.
    """
    db.query(Notification).filter(Notification.commander_id == current_commander.id).delete(synchronize_session=False)
    db.commit()

    return make_response(
        success=True,
        message="All notifications cleared from database."
    )
