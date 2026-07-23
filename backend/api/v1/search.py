import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, RecentSearch, PinnedResult, Research, Dataset, Experiment, EarthBookmark
from backend.services.search_service import SearchService
from backend.schemas.db_schemas import RecentSearchCreate, PinnedResultCreate

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def perform_search(
    q: str,
    type: str = "ALL",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Unified global search aggregated by SearchService.
    """
    if limit > 100:
        limit = 100
    if limit < 1:
        limit = 50

    results = SearchService.search_all(
        db=db,
        query_str=q,
        result_type=type,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        skip=skip
    )

    return make_response(
        success=True,
        message="Search completed successfully.",
        data=results
    )


@router.get("/suggestions", response_model=ApiResponse)
async def get_search_suggestions(
    q: str,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Typeahead suggestions list matching query prefixes in titles.
    """
    query_str = q.strip().lower()
    if not query_str:
        return make_response(success=True, message="No query provided.", data=[])

    suggestions = set()

    # Limit search results inside auto-completes to keep it lightweight
    try:
        # Search Research titles
        res_matches = db.query(Research.title).filter(Research.title.contains(query_str)).limit(5).all()
        for r in res_matches:
            suggestions.add(r[0])
            
        # Search Dataset names
        ds_matches = db.query(Dataset.dataset_name).filter(Dataset.dataset_name.contains(query_str)).limit(5).all()
        for d in ds_matches:
            suggestions.add(d[0])

        # Search Experiment titles
        exp_matches = db.query(Experiment.title).filter(Experiment.title.contains(query_str)).limit(5).all()
        for e in exp_matches:
            suggestions.add(e[0])

        # Search Bookmarks
        bm_matches = db.query(EarthBookmark.name).filter(EarthBookmark.name.contains(query_str)).limit(5).all()
        for b in bm_matches:
            suggestions.add(b[0])
    except Exception as e:
        # Gracefully handle database query failures
        pass

    # Sort suggestions deterministically
    sorted_suggestions = sorted(list(suggestions))[:10]

    return make_response(
        success=True,
        message="Autocomplete suggestions retrieved.",
        data=sorted_suggestions
    )


@router.get("/recent", response_model=ApiResponse)
async def get_recent_searches(
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve search history logs for the active Commander.
    """
    items = db.query(RecentSearch).filter(
        RecentSearch.commander_id == current_commander.id
    ).order_by(RecentSearch.timestamp.desc()).limit(20).all()

    result = []
    for item in items:
        result.append({
            "id": str(item.id),
            "query": item.query,
            "timestamp": item.timestamp.isoformat()
        })

    return make_response(
        success=True,
        message="Recent searches retrieved.",
        data=result
    )


@router.post("/recent", response_model=ApiResponse)
async def add_recent_search(
    payload: RecentSearchCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Log a search query to the history, with duplicate prevention and timestamp update.
    """
    raw_query = payload.query.strip()
    if not raw_query:
        raise HTTPException(status_code=400, detail="Query string cannot be empty.")

    norm_query = raw_query.lower()

    # Deduplication check
    existing = db.query(RecentSearch).filter(
        RecentSearch.commander_id == current_commander.id,
        RecentSearch.normalized_query == norm_query
    ).first()

    if existing:
        existing.timestamp = func.now()
        existing.query = raw_query  # Update query in case casing changed
        db.commit()
        db.refresh(existing)
        db_obj = existing
    else:
        db_obj = RecentSearch(
            commander_id=current_commander.id,
            query=raw_query,
            normalized_query=norm_query
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

    return make_response(
        success=True,
        message="Search history saved.",
        data={
            "id": str(db_obj.id),
            "query": db_obj.query,
            "timestamp": db_obj.timestamp.isoformat()
        }
    )


@router.delete("/recent/{id}", response_model=ApiResponse)
async def delete_recent_search(
    id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Delete a single search query record from history.
    """
    item = db.query(RecentSearch).filter(
        RecentSearch.id == id,
        RecentSearch.commander_id == current_commander.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recent search entry not found or access denied."
        )

    db.delete(item)
    db.commit()

    return make_response(success=True, message="Search history entry deleted.")


@router.delete("/recent", response_model=ApiResponse)
async def clear_recent_searches(
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Clear all search history logs for the active Commander.
    """
    db.query(RecentSearch).filter(
        RecentSearch.commander_id == current_commander.id
    ).delete(synchronize_session=False)
    db.commit()

    return make_response(success=True, message="Search history cleared.")


@router.get("/pinned", response_model=ApiResponse)
async def get_pinned_results(
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve all pinned results for the active Commander.
    """
    items = db.query(PinnedResult).filter(
        PinnedResult.commander_id == current_commander.id
    ).order_by(PinnedResult.created_at.desc()).all()

    result = []
    for item in items:
        result.append({
            "id": str(item.id),
            "item_id": item.item_id,
            "item_type": item.item_type,
            "title": item.title,
            "url": item.url,
            "created_at": item.created_at.isoformat()
        })

    return make_response(
        success=True,
        message="Pinned search results retrieved.",
        data=result
    )


@router.post("/pinned", response_model=ApiResponse)
async def pin_search_result(
    payload: PinnedResultCreate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Pin a search result. Idempotently ignores/updates on uniqueness conflicts.
    """
    # Check if duplicate pin exists
    existing = db.query(PinnedResult).filter(
        PinnedResult.commander_id == current_commander.id,
        PinnedResult.item_id == payload.item_id,
        PinnedResult.item_type == payload.item_type
    ).first()

    if existing:
        # Idempotently return existing pin
        return make_response(
            success=True,
            message="Result is already pinned.",
            data={
                "id": str(existing.id),
                "item_id": existing.item_id,
                "item_type": existing.item_type,
                "title": existing.title,
                "url": existing.url,
                "created_at": existing.created_at.isoformat()
            }
        )

    db_obj = PinnedResult(
        commander_id=current_commander.id,
        item_id=payload.item_id,
        item_type=payload.item_type,
        title=payload.title,
        url=payload.url
    )

    try:
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
    except IntegrityError:
        db.rollback()
        # Fallback query if concurrent insert occurred
        db_obj = db.query(PinnedResult).filter(
            PinnedResult.commander_id == current_commander.id,
            PinnedResult.item_id == payload.item_id,
            PinnedResult.item_type == payload.item_type
        ).first()
        if not db_obj:
            raise HTTPException(status_code=400, detail="Unique constraint failure during pin creation.")

    return make_response(
        success=True,
        message="Result successfully pinned.",
        data={
            "id": str(db_obj.id),
            "item_id": db_obj.item_id,
            "item_type": db_obj.item_type,
            "title": db_obj.title,
            "url": db_obj.url,
            "created_at": db_obj.created_at.isoformat()
        }
    )


@router.delete("/pinned/{id}", response_model=ApiResponse)
async def unpin_result(
    id: uuid.UUID,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Unpin a search result.
    """
    item = db.query(PinnedResult).filter(
        PinnedResult.id == id,
        PinnedResult.commander_id == current_commander.id
    ).first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pinned result not found or access denied."
        )

    db.delete(item)
    db.commit()

    return make_response(success=True, message="Result successfully unpinned.")
