import time
import os
import sys
import shutil
import threading
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.core.config import settings
from backend.services.external.rate_limiter import limiters
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

@router.get("/health/liveness", response_model=ApiResponse)
async def system_liveness():
    """
    Lightweight public liveness monitor checking status of ASGI pipeline.
    """
    return make_response(
        success=True,
        message="Heartbeat nominal.",
        data={"status": "live", "timestamp": time.time()}
    )

_last_cpu_time = None
_last_cpu_timestamp = None

def get_instant_process_cpu() -> float | str:
    global _last_cpu_time, _last_cpu_timestamp
    try:
        t = os.times()
        current_cpu_time = t.user + t.system
        current_timestamp = time.time()
        
        if _last_cpu_time is None or _last_cpu_timestamp is None:
            _last_cpu_time = current_cpu_time
            _last_cpu_timestamp = current_timestamp
            return 0.0
            
        delta_cpu = current_cpu_time - _last_cpu_time
        delta_time = current_timestamp - _last_cpu_timestamp
        
        _last_cpu_time = current_cpu_time
        _last_cpu_timestamp = current_timestamp
        
        if delta_time <= 0:
            return 0.0
        
        cpu_count = os.cpu_count() or 1
        percent = (delta_cpu / delta_time) * 100 / cpu_count
        return round(min(100.0, max(0.0, percent)), 2)
    except Exception:
        return "N/A"

def get_process_memory() -> int:
    try:
        if sys.platform == "win32":
            import ctypes
            from ctypes import Structure, c_size_t, sizeof
            
            class PROCESS_MEMORY_COUNTERS(Structure):
                _fields_ = [
                    ("cb", ctypes.c_ulong),
                    ("PageFaultCount", ctypes.c_ulong),
                    ("PeakWorkingSetSize", c_size_t),
                    ("WorkingSetSize", c_size_t),
                    ("QuotaPeakPagedPoolUsage", c_size_t),
                    ("QuotaPagedPoolUsage", c_size_t),
                    ("QuotaPeakNonPagedPoolUsage", c_size_t),
                    ("QuotaNonPagedPoolUsage", c_size_t),
                    ("PagefileUsage", c_size_t),
                    ("PeakPagefileUsage", c_size_t),
                ]
                
            GetProcessMemoryInfo = ctypes.windll.psapi.GetProcessMemoryInfo
            GetCurrentProcess = ctypes.windll.kernel32.GetCurrentProcess
            
            process = GetCurrentProcess()
            counters = PROCESS_MEMORY_COUNTERS()
            counters.cb = sizeof(PROCESS_MEMORY_COUNTERS)
            
            if GetProcessMemoryInfo(process, ctypes.byref(counters), counters.cb):
                return counters.WorkingSetSize
        else:
            import resource
            return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss * 1024
    except Exception:
        pass
    return 0

@router.get("/health/readiness", response_model=ApiResponse)
async def system_readiness(
    db: Session = Depends(get_db),
    current_commander: Commander = Depends(get_current_commander)
):
    """
    Authenticated diagnostics endpoint compiling actual system, database,
    storage, API integrations, and security event statuses.
    """
    # 1. Database Telemetry
    db_type = "postgresql" if settings.DATABASE_URL.startswith("postgresql") else "sqlite"
    db_status = "operational"
    db_latency = 0.0
    start_db = time.time()
    try:
        db.execute(text("SELECT 1")).scalar()
        db_latency = round((time.time() - start_db) * 1000, 2)
    except Exception:
        db_status = "offline"
        
    db_size_mb = "N/A"
    if db_type == "sqlite" and db_status == "operational":
        try:
            db_file = settings.DATABASE_URL.replace("sqlite:///", "")
            if os.path.exists(db_file):
                db_size_mb = round(os.path.getsize(db_file) / (1024 * 1024), 2)
        except Exception:
            pass

    # 2. Storage Telemetry
    storage_status = "operational"
    total_space = 0
    available_space = 0
    used_percent = 0.0
    
    # Write/read health check
    try:
        os.makedirs("./storage", exist_ok=True)
        test_file = "./storage/.health_check_temp"
        with open(test_file, "w") as f:
            f.write("JCC_HEALTH")
        with open(test_file, "r") as f:
            content = f.read()
        os.remove(test_file)
        if content != "JCC_HEALTH":
            storage_status = "degraded"
    except Exception:
        storage_status = "critical"
        
    # Disk capacity stats
    try:
        total, used, free = shutil.disk_usage("./storage")
        total_space = total
        available_space = free
        used_percent = round((used / total) * 100, 2)
    except Exception:
        if storage_status == "operational":
            storage_status = "degraded"

    # 3. CPU & Process Telemetry
    cpu_util = get_instant_process_cpu()
    ram_bytes = get_process_memory()
    ram_mb = round(ram_bytes / (1024 * 1024), 2) if ram_bytes > 0 else "N/A"
    thread_count = threading.active_count()
    uptime_seconds = round(time.time() - STARTUP_TIME, 2)

    # 4. API Integration Telemetry
    def get_provider_status(provider_name: str, has_key: bool) -> dict:
        is_mock = settings.GLOBAL_MOCK_MODE
        if not has_key:
            status_val = "offline"
        else:
            status_val = "standby" if is_mock else "connected"
            
        rate_info = {"remaining": 60, "limit": 60}
        limiter = limiters.get(provider_name)
        if limiter:
            lim_status = limiter.get_status()
            rate_info = {
                "remaining": lim_status["tokens_remaining"],
                "limit": lim_status["max_capacity"]
            }
            
        return {
            "status": status_val,
            "configured": has_key,
            "latency_ms": "N/A",  # Mock mode checks do not trigger outbound latency
            "rate_limit": rate_info
        }

    nasa_has_key = settings.NASA_API_KEY is not None and settings.NASA_API_KEY != "" and "placeholder" not in settings.NASA_API_KEY.lower()
    weather_has_key = settings.OPENWEATHER_API_KEY is not None and settings.OPENWEATHER_API_KEY != "" and "placeholder" not in settings.OPENWEATHER_API_KEY.lower()
    ai_has_key = (settings.OPENAI_API_KEY is not None and settings.OPENAI_API_KEY != "") or (settings.GOOGLE_API_KEY is not None and settings.GOOGLE_API_KEY != "")
    github_has_key = settings.GITHUB_API_KEY is not None and settings.GITHUB_API_KEY != "" and "placeholder" not in settings.GITHUB_API_KEY.lower()

    # 5. Application Health & Logging Counts
    error_count = db.query(ActivityLog).filter(ActivityLog.severity == "error").count()
    failed_logins = db.query(ActivityLog).filter(ActivityLog.module == "security", ActivityLog.action == "login_failure").count()
    critical_security_events = db.query(SecurityEvent).filter(SecurityEvent.risk_level == "critical").count()

    readiness_data = {
        "liveness": "live",
        "uptime": uptime_seconds,
        "runtime": {
            "pid": os.getpid(),
            "platform": sys.platform,
            "python_version": sys.version.split(" ")[0],
            "active_threads": thread_count,
            "cpu_utilization_percent": cpu_util,
            "memory_usage_mb": ram_mb
        },
        "database": {
            "status": db_status,
            "type": db_type,
            "query_latency_ms": db_latency,
            "file_size_mb": db_size_mb
        },
        "storage": {
            "status": storage_status,
            "total_bytes": total_space,
            "available_bytes": available_space,
            "used_percent": used_percent
        },
        "api_connectivity": {
            "nasa": get_provider_status("nasa", nasa_has_key),
            "weather": get_provider_status("weather", weather_has_key),
            "ai": get_provider_status("ai", ai_has_key),
            "github": get_provider_status("github", github_has_key)
        },
        "application": {
            "active_api_requests": 1,  # Represent current active thread call
            "error_logs_count": error_count,
            "last_health_check_timestamp": time.time()
        },
        "security": {
            "session_status": "authenticated",
            "critical_security_events": critical_security_events,
            "failed_authentications_count": failed_logins
        }
    }

    return make_response(
        success=True,
        message="Detailed system readiness diagnostics loaded.",
        data=readiness_data
    )
