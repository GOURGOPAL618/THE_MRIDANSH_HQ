import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, Settings
from backend.repositories.repos import settings_repo
from backend.schemas.db_schemas import SettingsUpdate

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def get_commander_settings(
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Retrieve user preferences settings for the active Commander.
    Auto-creates default configurations idempotently if none exist yet.
    """
    settings_record = settings_repo.get_by_commander(db, commander_id=current_commander.id)
    if not settings_record:
        try:
            settings_record = Settings(
                commander_id=current_commander.id,
                theme="default",
                volume=0.5,
                is_muted=False,
                notifications_enabled=True,
                performance_mode="quality"
            )
            db.add(settings_record)
            db.commit()
            db.refresh(settings_record)
        except Exception:
            db.rollback()
            settings_record = settings_repo.get_by_commander(db, commander_id=current_commander.id)
            if not settings_record:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to initialize Commander settings catalog."
                )
                
    return make_response(
        success=True,
        message="Commander cockpit settings retrieved successfully.",
        data={
            "id": str(settings_record.id),
            "commander_id": str(settings_record.commander_id),
            "theme": settings_record.theme,
            "volume": settings_record.volume,
            "is_muted": settings_record.is_muted,
            "notifications_enabled": settings_record.notifications_enabled,
            "performance_mode": settings_record.performance_mode,
            # Visual theme overrides
            "accent_color": settings_record.accent_color,
            "panel_opacity": settings_record.panel_opacity,
            "glow_intensity": settings_record.glow_intensity,
            "animation_speed": settings_record.animation_speed,
            "border_radius": settings_record.border_radius,
            "font_size": settings_record.font_size
        }
    )


@router.put("", response_model=ApiResponse)
async def update_commander_settings(
    payload: SettingsUpdate,
    current_commander: Commander = Depends(get_current_commander),
    db: Session = Depends(get_db)
):
    """
    Update active Commander's cockpit preferences.
    Validates theme, volume, and performance modes constraints.
    """
    settings_record = settings_repo.get_by_commander(db, commander_id=current_commander.id)
    if not settings_record:
        # Fallback create if not exists
        try:
            settings_record = Settings(
                commander_id=current_commander.id,
                theme="default",
                volume=0.5,
                is_muted=False,
                notifications_enabled=True,
                performance_mode="quality"
            )
            db.add(settings_record)
            db.commit()
            db.refresh(settings_record)
        except Exception:
            db.rollback()
            settings_record = settings_repo.get_by_commander(db, commander_id=current_commander.id)
            
    # Apply and Validate fields
    if payload.volume is not None:
        if not (0.0 <= payload.volume <= 1.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Volume must be a float between 0.0 and 1.0."
            )
        settings_record.volume = payload.volume
        
    if payload.theme is not None:
        allowed_themes = {"default", "arctic", "midnight", "deepspace", "solar", "engineering", "minimal"}
        if payload.theme not in allowed_themes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported theme. Supported: {list(allowed_themes)}"
            )
        settings_record.theme = payload.theme
        
    if payload.performance_mode is not None:
        allowed_perf_modes = {"quality", "performance"}
        if payload.performance_mode not in allowed_perf_modes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported performance_mode. Supported: {list(allowed_perf_modes)}"
            )
        settings_record.performance_mode = payload.performance_mode
        
    if payload.is_muted is not None:
        settings_record.is_muted = payload.is_muted
        
    if payload.notifications_enabled is not None:
        settings_record.notifications_enabled = payload.notifications_enabled

    # Visual Theme Overrides PUT mappings
    if payload.accent_color is not None or "accent_color" in payload.model_fields_set:
        settings_record.accent_color = payload.accent_color
    if payload.panel_opacity is not None:
        settings_record.panel_opacity = payload.panel_opacity
    if payload.glow_intensity is not None:
        settings_record.glow_intensity = payload.glow_intensity
    if payload.animation_speed is not None:
        settings_record.animation_speed = payload.animation_speed
    if payload.border_radius is not None:
        settings_record.border_radius = payload.border_radius
    if payload.font_size is not None:
        settings_record.font_size = payload.font_size
        
    db.commit()
    db.refresh(settings_record)
    
    return make_response(
        success=True,
        message="Commander settings updated successfully.",
        data={
            "id": str(settings_record.id),
            "commander_id": str(settings_record.commander_id),
            "theme": settings_record.theme,
            "volume": settings_record.volume,
            "is_muted": settings_record.is_muted,
            "notifications_enabled": settings_record.notifications_enabled,
            "performance_mode": settings_record.performance_mode,
            # Visual theme overrides
            "accent_color": settings_record.accent_color,
            "panel_opacity": settings_record.panel_opacity,
            "glow_intensity": settings_record.glow_intensity,
            "animation_speed": settings_record.animation_speed,
            "border_radius": settings_record.border_radius,
            "font_size": settings_record.font_size
        }
    )
