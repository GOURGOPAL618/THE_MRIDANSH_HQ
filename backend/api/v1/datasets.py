import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, Dataset
from backend.repositories.repos import dataset_repo
from backend.schemas.db_schemas import DatasetCreate, DatasetUpdate

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def get_all_datasets(
    search: Optional[str] = None,
    category: Optional[str] = None,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve datasets catalog with search and category filters working independently or together.
    """
    query = db.query(Dataset)
    
    # Standard SQLite/Postgres database filters
    if category and category.upper() != "ALL":
        query = query.filter(Dataset.category == category)
        
    items = query.order_by(Dataset.created_at.desc()).all()
    
    # Search filter applied in Python for robust case-insensitive contains logic
    if search:
        search_lower = search.lower()
        items = [
            i for i in items
            if search_lower in i.dataset_name.lower() or search_lower in i.description.lower()
        ]
        
    result = []
    for item in items:
        result.append({
            "id": str(item.id),
            "dataset_name": item.dataset_name,
            "category": item.category,
            "source": item.source,
            "description": item.description,
            "location": item.location,
            "created_at": item.created_at.isoformat()
        })
        
    return make_response(
        success=True,
        message="Aerospace datasets directory retrieved successfully.",
        data=result
    )


@router.get("/{dataset_id}", response_model=ApiResponse)
async def get_dataset_by_id(
    dataset_id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve single dataset entry metadata.
    """
    item = dataset_repo.get(db, id=dataset_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aerospace dataset not found in coordinates directory."
        )
        
    return make_response(
        success=True,
        message="Aerospace dataset retrieved successfully.",
        data={
            "id": str(item.id),
            "dataset_name": item.dataset_name,
            "category": item.category,
            "source": item.source,
            "description": item.description,
            "location": item.location,
            "created_at": item.created_at.isoformat()
        }
    )


@router.post("", response_model=ApiResponse)
async def register_dataset(
    payload: DatasetCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Register a new dataset entry. Does NOT write physical files.
    """
    item = dataset_repo.create(db, obj_in=payload)
    return make_response(
        success=True,
        message="Aerospace dataset registered successfully to catalog.",
        data={
            "id": str(item.id),
            "dataset_name": item.dataset_name,
            "category": item.category,
            "source": item.source,
            "description": item.description,
            "location": item.location,
            "created_at": item.created_at.isoformat()
        }
    )


@router.put("/{dataset_id}", response_model=ApiResponse)
async def update_dataset_metadata(
    dataset_id: uuid.UUID,
    payload: DatasetUpdate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Update catalog metadata fields. Does NOT manipulate physical storage files.
    """
    item = dataset_repo.get(db, id=dataset_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aerospace dataset not found in coordinates directory."
        )
        
    updated_item = dataset_repo.update(db, db_obj=item, obj_in=payload)
    return make_response(
        success=True,
        message="Dataset catalog details updated successfully.",
        data={
            "id": str(updated_item.id),
            "dataset_name": updated_item.dataset_name,
            "category": updated_item.category,
            "source": updated_item.source,
            "description": updated_item.description,
            "location": updated_item.location,
            "created_at": updated_item.created_at.isoformat()
        }
    )


@router.delete("/{dataset_id}", response_model=ApiResponse)
async def unregister_dataset(
    dataset_id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Unregister dataset. Deletes ONLY the database catalog record. No files are deleted.
    """
    item = dataset_repo.get(db, id=dataset_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aerospace dataset not found in coordinates directory."
        )
        
    dataset_repo.remove(db, id=dataset_id)
    return make_response(
        success=True,
        message="Dataset registration successfully removed from vault databases catalog."
    )
