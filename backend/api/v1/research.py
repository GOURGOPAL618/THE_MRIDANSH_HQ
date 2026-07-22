import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, Research
from backend.repositories.repos import research_repo
from backend.schemas.db_schemas import ResearchCreate, ResearchUpdate

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def get_all_research(
    search: Optional[str] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve all research notes with search, category, and tag filtering.
    """
    items = db.query(Research).order_by(Research.created_at.desc()).all()
    
    # Apply filtering in Python to ensure database-agnostic behavior
    if category:
        items = [i for i in items if i.category.lower() == category.lower()]
        
    if tag:
        items = [i for i in items if i.tags and tag.lower() in [t.lower() for t in i.tags]]
        
    if search:
        search_lower = search.lower()
        items = [
            i for i in items 
            if search_lower in i.title.lower() or search_lower in i.description.lower()
        ]
        
    # Map to schema-like dictionaries
    result = []
    for item in items:
        result.append({
            "id": str(item.id),
            "title": item.title,
            "category": item.category,
            "description": item.description,
            "tags": item.tags or [],
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        })
        
    return make_response(
        success=True,
        message="Research documentation catalog retrieved successfully.",
        data=result
    )


@router.get("/{research_id}", response_model=ApiResponse)
async def get_research_by_id(
    research_id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve a single research document by UUID.
    """
    item = research_repo.get(db, id=research_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research document not found in the archives."
        )
        
    return make_response(
        success=True,
        message="Research document retrieved successfully.",
        data={
            "id": str(item.id),
            "title": item.title,
            "category": item.category,
            "description": item.description,
            "tags": item.tags or [],
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        }
    )


@router.post("", response_model=ApiResponse)
async def create_research(
    payload: ResearchCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Create a new research document.
    """
    item = research_repo.create(db, obj_in=payload)
    return make_response(
        success=True,
        message="New research document registered to vault.",
        data={
            "id": str(item.id),
            "title": item.title,
            "category": item.category,
            "description": item.description,
            "tags": item.tags or [],
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        }
    )


@router.put("/{research_id}", response_model=ApiResponse)
async def update_research(
    research_id: uuid.UUID,
    payload: ResearchUpdate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Update details of an existing research document.
    """
    item = research_repo.get(db, id=research_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research document not found in the archives."
        )
        
    updated_item = research_repo.update(db, db_obj=item, obj_in=payload)
    return make_response(
        success=True,
        message="Research document updated successfully.",
        data={
            "id": str(updated_item.id),
            "title": updated_item.title,
            "category": updated_item.category,
            "description": updated_item.description,
            "tags": updated_item.tags or [],
            "created_at": updated_item.created_at.isoformat(),
            "updated_at": updated_item.updated_at.isoformat()
        }
    )


@router.delete("/{research_id}", response_model=ApiResponse)
async def delete_research(
    research_id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Delete a research document by UUID.
    """
    item = research_repo.get(db, id=research_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Research document not found in the archives."
        )
        
    research_repo.remove(db, id=research_id)
    return make_response(
        success=True,
        message="Research document successfully deleted from archives."
    )
