import uuid
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, Experiment, Dataset, Research
from backend.repositories.repos import experiment_repo
from backend.schemas.db_schemas import ExperimentCreate, ExperimentUpdate

router = APIRouter()

# Structured Metadata sub-schema stored inside notes column
class ExperimentNotesPayload(BaseModel):
    category: str = Field("General", max_length=100)
    target_thrust: Optional[float] = None
    nozzle_yaw: Optional[float] = None
    nozzle_pitch: Optional[float] = None
    duration_seconds: Optional[int] = None
    dataset_id: Optional[str] = None
    research_id: Optional[str] = None
    observations: Optional[str] = None

# Centralized backend helper functions
def serialize_notes(payload: ExperimentNotesPayload) -> str:
    return payload.json()

def deserialize_notes(notes_str: Optional[str]) -> ExperimentNotesPayload:
    if not notes_str:
        return ExperimentNotesPayload()
    try:
        data = json.loads(notes_str)
        if not isinstance(data, dict):
            return ExperimentNotesPayload(observations=notes_str)
        return ExperimentNotesPayload(**data)
    except Exception:
        return ExperimentNotesPayload(observations=notes_str)

def validate_experiment_payload(payload_dict: Dict[str, Any], db: Session) -> ExperimentNotesPayload:
    try:
        parsed = ExperimentNotesPayload(**payload_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Malformed metadata parameters structure: {str(e)}"
        )
        
    # Validate UUID references if provided
    if parsed.dataset_id:
        try:
            ds_uuid = uuid.UUID(parsed.dataset_id)
            ds_item = db.query(Dataset).filter(Dataset.id == ds_uuid).first()
            if not ds_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced dataset ID {parsed.dataset_id} does not exist."
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Referenced dataset ID {parsed.dataset_id} is not a valid UUID."
            )
            
    if parsed.research_id:
        try:
            res_uuid = uuid.UUID(parsed.research_id)
            res_item = db.query(Research).filter(Research.id == res_uuid).first()
            if not res_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Referenced research document ID {parsed.research_id} does not exist."
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Referenced research document ID {parsed.research_id} is not a valid UUID."
            )
            
    # Validate parameters values ranges
    if parsed.target_thrust is not None and not (0.0 <= parsed.target_thrust <= 100.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target thrust must be between 0.0% and 100.0%."
        )
        
    if parsed.nozzle_yaw is not None and not (-5.0 <= parsed.nozzle_yaw <= 5.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nozzle yaw gimbal must be between -5.0° and +5.0°."
        )
        
    if parsed.nozzle_pitch is not None and not (-5.0 <= parsed.nozzle_pitch <= 5.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nozzle pitch gimbal must be between -5.0° and +5.0°."
        )
        
    if parsed.duration_seconds is not None and parsed.duration_seconds <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duration seconds must be a positive integer."
        )
        
    return parsed

def validate_status_transition(old_status: str, new_status: str):
    allowed_statuses = {"draft", "active", "completed", "failed"}
    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Status '{new_status}' is invalid. Supported: {list(allowed_statuses)}"
        )
        
    if old_status == new_status:
        return
        
    valid_transitions = {
        "draft": {"active"},
        "active": {"completed", "failed"}
    }
    
    allowed_next = valid_transitions.get(old_status, set())
    if new_status not in allowed_next:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid state transition: '{old_status}' -> '{new_status}' is not permitted."
        )


# API CRUD Routes
@router.get("", response_model=ApiResponse)
async def get_all_experiments(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve experiments with status and keyword filters.
    """
    query = db.query(Experiment)
    
    if status_filter:
        query = query.filter(Experiment.status == status_filter)
        
    items = query.order_by(Experiment.created_at.desc()).all()
    
    if search:
        search_lower = search.lower()
        items = [
            i for i in items
            if search_lower in i.title.lower() or search_lower in i.objective.lower()
        ]
        
    result = []
    for item in items:
        notes_parsed = deserialize_notes(item.notes)
        result.append({
            "id": str(item.id),
            "title": item.title,
            "objective": item.objective,
            "status": item.status,
            "notes": notes_parsed.dict(),
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        })
        
    return make_response(
        success=True,
        message="Experiments directory retrieved successfully.",
        data=result
    )


@router.get("/{experiment_id}", response_model=ApiResponse)
async def get_experiment_by_id(
    experiment_id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve a single experiment details.
    """
    item = experiment_repo.get(db, id=experiment_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found in logs."
        )
        
    notes_parsed = deserialize_notes(item.notes)
    return make_response(
        success=True,
        message="Experiment retrieved successfully.",
        data={
            "id": str(item.id),
            "title": item.title,
            "objective": item.objective,
            "status": item.status,
            "notes": notes_parsed.dict(),
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        }
    )


@router.post("", response_model=ApiResponse)
async def create_experiment(
    payload: ExperimentCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Register a new experiment in draft state.
    """
    # Enforce starting status is draft
    payload.status = "draft"
    
    # Parse and validate notes metadata if provided
    metadata = ExperimentNotesPayload()
    if payload.notes:
        try:
            notes_dict = json.loads(payload.notes)
            metadata = validate_experiment_payload(notes_dict, db)
        except (json.JSONDecodeError, TypeError):
            # If payload is just plain text notes, wrap it
            metadata = ExperimentNotesPayload(observations=payload.notes)
            
    payload.notes = serialize_notes(metadata)
    
    item = experiment_repo.create(db, obj_in=payload)
    notes_parsed = deserialize_notes(item.notes)
    return make_response(
        success=True,
        message="New experiment draft registered.",
        data={
            "id": str(item.id),
            "title": item.title,
            "objective": item.objective,
            "status": item.status,
            "notes": notes_parsed.dict(),
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat()
        }
    )


@router.put("/{experiment_id}", response_model=ApiResponse)
async def update_experiment(
    experiment_id: uuid.UUID,
    payload: ExperimentUpdate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Update experiment parameters or transition status.
    """
    item = experiment_repo.get(db, id=experiment_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found in logs."
        )
        
    # Enforce status transitions
    if payload.status:
        validate_status_transition(item.status, payload.status)
        
    # Parse and validate notes metadata if provided
    if payload.notes:
        try:
            notes_dict = json.loads(payload.notes)
            metadata = validate_experiment_payload(notes_dict, db)
            payload.notes = serialize_notes(metadata)
        except (json.JSONDecodeError, TypeError):
            # If payload is just plain text notes, wrap it
            metadata = ExperimentNotesPayload(observations=payload.notes)
            payload.notes = serialize_notes(metadata)
            
    updated_item = experiment_repo.update(db, db_obj=item, obj_in=payload)
    notes_parsed = deserialize_notes(updated_item.notes)
    return make_response(
        success=True,
        message="Experiment details updated successfully.",
        data={
            "id": str(updated_item.id),
            "title": updated_item.title,
            "objective": updated_item.objective,
            "status": updated_item.status,
            "notes": notes_parsed.dict(),
            "created_at": updated_item.created_at.isoformat(),
            "updated_at": updated_item.updated_at.isoformat()
        }
    )


@router.delete("/{experiment_id}", response_model=ApiResponse)
async def delete_experiment(
    experiment_id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Delete an experiment.
    """
    item = experiment_repo.get(db, id=experiment_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found in logs."
        )
        
    experiment_repo.remove(db, id=experiment_id)
    return make_response(
        success=True,
        message="Experiment removed successfully from archives."
    )
