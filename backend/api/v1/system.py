import time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import (
    Commander,
    CommanderSession,
    ActivityLog,
    SecurityEvent,
    Research,
    Dataset,
    Experiment
)

router = APIRouter()

# Store application startup time at module load
STARTUP_TIME = time.time()

@router.get("", response_model=ApiResponse)
async def system_base(current_commander: Commander = Depends(get_current_commander)):
    """
    Base endpoint placeholder for cockpit systems parameters
    """
    return make_response(
        success=True,
        message="System parameters endpoints base placeholder.",
        data={"cockpit_version": "v1.0.0", "hardware_lock": "nominal"}
    )

@router.get("/dashboard", response_model=ApiResponse)
async def system_dashboard(
    db: Session = Depends(get_db),
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Retrieve lightweight summary information for the central Commander Dashboard.
    """
    # 1. Calculate Uptime
    uptime = time.time() - STARTUP_TIME

    # 2. Query Session Details
    active_sessions_count = db.query(CommanderSession).filter(CommanderSession.status == "active").count()
    total_sessions_count = db.query(CommanderSession).count()

    # 3. Query Database Row Counts (Mission Statistics)
    total_research = db.query(Research).count()
    total_datasets = db.query(Dataset).count()
    total_experiments = db.query(Experiment).count()
    total_logs = db.query(ActivityLog).count()
    total_security_events = db.query(SecurityEvent).count()

    # 4. Fetch Recent Activities (Last 5 records from each audit table)
    recent_sessions = db.query(CommanderSession).order_by(CommanderSession.login_time.desc()).limit(5).all()
    recent_events = db.query(SecurityEvent).order_by(SecurityEvent.timestamp.desc()).limit(5).all()
    recent_logs = db.query(ActivityLog).order_by(ActivityLog.timestamp.desc()).limit(5).all()

    # 5. Merge Activities Server-Side Chronologically
    merged_activity = []

    # Map session logins
    for s in recent_sessions:
        merged_activity.append({
            "timestamp": s.login_time.isoformat(),
            "event": "COCKPIT LOGIN",
            "details": f"Commander session initiated from IP {s.ip_address} using {s.browser[:50]}.",
            "risk_level": "low",
            "success": True
        })

    # Map security log events
    for e in recent_events:
        merged_activity.append({
            "timestamp": e.timestamp.isoformat(),
            "event": e.event.upper(),
            "details": e.details,
            "risk_level": e.risk_level,
            "success": "failed" not in e.details.lower()
        })

    # Map standard activity logs
    for l in recent_logs:
        merged_activity.append({
            "timestamp": l.timestamp.isoformat(),
            "event": f"{l.module.upper()} ACTIVITY",
            "details": l.description,
            "risk_level": "low",
            "success": True
        })

    # Sort merged activity feed descending by ISO timestamp and take top 10
    merged_activity = sorted(merged_activity, key=lambda x: x["timestamp"], reverse=True)[:10]

    # 6. Build Module Status (Return nominal default values for decoupled status cards)
    module_status = {
        "engine": "nominal",
        "radar": "nominal",
        "earth": "nominal",
        "research": "nominal",
        "security": "nominal" if total_security_events == 0 else "warning"
    }

    # 7. Package Summary Data payload
    summary_data = {
        "system_status": {
            "uptime": round(uptime, 2),
            "api_status": "online",
            "db_status": "online",
            "active_sessions": active_sessions_count,
            "total_sessions": total_sessions_count
        },
        "mission_stats": {
            "total_research": total_research,
            "total_datasets": total_datasets,
            "total_experiments": total_experiments,
            "total_logs": total_logs
        },
        "recent_activity": merged_activity,
        "module_status": module_status
    }

    return make_response(
        success=True,
        message="Dashboard summary telemetry retrieved successfully.",
        data=summary_data
    )
