import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, EarthBookmark
from backend.database.session import get_db
from backend.repositories.repos import bookmark_repo
from backend.schemas.earth import BookmarkCreate, BookmarkOut, BookmarkCreateDB

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def earth_base(current_commander: Commander = Depends(get_current_commander)):
    """
    Base endpoint placeholder for Earth operations telemetry
    """
    return make_response(
        success=True,
        message="Earth operations coordinates endpoints base.",
        data={"orbital_tracking": "active", "coordinates_cached": 0}
    )

@router.get("/bookmarks", response_model=ApiResponse)
async def get_bookmarks(
    db: Session = Depends(get_db),
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Fetch all saved Earth bookmarks for the active commander.
    """
    bookmarks = bookmark_repo.get_by_commander(db, current_commander.id)
    # Serialize to dictionary list for safety
    bookmarks_out = [
        {
            "id": str(b.id),
            "commander_id": str(b.commander_id),
            "name": b.name,
            "latitude": b.latitude,
            "longitude": b.longitude,
            "altitude": b.altitude,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }
        for b in bookmarks
    ]
    return make_response(
        success=True,
        message="Bookmarks retrieved successfully.",
        data=bookmarks_out
    )

@router.post("/bookmarks", response_model=ApiResponse)
async def create_bookmark(
    bookmark_in: BookmarkCreate,
    db: Session = Depends(get_db),
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Save a new Earth bookmark for the active commander.
    """
    # Instantiate Pydantic v2 DB creation model containing the resolved commander_id
    db_in = BookmarkCreateDB(
        name=bookmark_in.name,
        latitude=bookmark_in.latitude,
        longitude=bookmark_in.longitude,
        altitude=bookmark_in.altitude,
        commander_id=current_commander.id
    )
    new_bookmark = bookmark_repo.create(db, obj_in=db_in)
    
    bookmark_out = {
        "id": str(new_bookmark.id),
        "commander_id": str(new_bookmark.commander_id),
        "name": new_bookmark.name,
        "latitude": new_bookmark.latitude,
        "longitude": new_bookmark.longitude,
        "altitude": new_bookmark.altitude,
        "created_at": new_bookmark.created_at.isoformat() if new_bookmark.created_at else None
    }
    
    return make_response(
        success=True,
        message="Bookmark created successfully.",
        data=bookmark_out
    )

@router.delete("/bookmarks/{bookmark_id}", response_model=ApiResponse)
async def delete_bookmark(
    bookmark_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Delete a saved Earth bookmark. Enforces strict commander ownership.
    """
    bookmark = bookmark_repo.get_by_commander_and_id(db, current_commander.id, bookmark_id)
    if not bookmark:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bookmark not found or access denied."
        )
    
    bookmark_repo.remove(db, id=bookmark_id)
    return make_response(
        success=True,
        message="Bookmark deleted successfully.",
        data={"deleted_id": str(bookmark_id)}
    )
