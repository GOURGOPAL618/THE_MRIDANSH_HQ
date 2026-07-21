import time
import math
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.database.session import get_db
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander, EngineLog
from backend.repositories.repos import engine_log_repo
from backend.schemas.db_schemas import EngineLogCreate, EngineLogOut

router = APIRouter()
logger = logging.getLogger("system")
security_logger = logging.getLogger("security")

# Async lock to prevent concurrent command race conditions
engine_command_lock = asyncio.Lock()

# Helper function to enrich dynamic parameters
def enrich_telemetry(base: dict, elapsed: float, now: float) -> dict:
    state = base["engine_state"]
    temp = base["temperature"]
    pressure = base["coolant_pressure"]
    mag_lock = base["magnetic_lock"]
    
    # 1. Engine Efficiency
    if state == "shutdown":
        efficiency = 0.0
    elif state == "emergency_stop":
        efficiency = 0.0
    elif state == "igniting":
        progress = max(0.0, min(1.0, elapsed / 10.0))
        efficiency = round(progress * 88.5, 2)
    elif state == "nominal":
        osc = math.sin(now * 0.2) * 0.4
        efficiency = round(94.2 + osc, 2)
    else:
        efficiency = 0.0
        
    # 2. Magnetic Containment Status
    if not mag_lock:
        mag_status = "FAILED"
    elif temp > 1350.0:
        mag_status = "UNSTABLE"
    else:
        mag_status = "LOCKED"
        
    # 3. Coolant Status
    if pressure > 10.0:
        coolant_status = "CRITICAL"
    elif pressure > 6.0 or temp > 1300.0:
        coolant_status = "WARNING"
    else:
        coolant_status = "NOMINAL"
        
    # 4. Thermal Status
    if temp > 1400.0:
        thermal_status = "OVERHEAT"
    elif state == "nominal":
        thermal_status = "NOMINAL"
    elif state == "igniting":
        thermal_status = "WARMUP"
    else:
        thermal_status = "SAFE"
        
    # 5. Safety Envelope
    if temp > 1400.0 or pressure > 10.0 or not mag_lock:
        safety_envelope = "DANGER"
    elif temp > 1300.0 or pressure > 6.0:
        safety_envelope = "WARNING"
    else:
        safety_envelope = "SAFE"
        
    base.update({
        "engine_efficiency": efficiency,
        "magnetic_status": mag_status,
        "coolant_status": coolant_status,
        "thermal_status": thermal_status,
        "safety_envelope": safety_envelope
    })
    return base

# Helper function to compute current telemetry dynamically (without DB writes)
def compute_current_telemetry(latest_log: Optional[EngineLog]) -> dict:
    if not latest_log:
        return enrich_telemetry({
            "engine_state": "shutdown",
            "thrust_level": 0.0,
            "temperature": 293.15,
            "coolant_pressure": 1.0,
            "fuel_flow": 0.0,
            "magnetic_lock": True
        }, 0.0, time.time())
    
    state = latest_log.engine_state
    log_time = latest_log.timestamp
    if log_time.tzinfo is None:
        log_time = log_time.replace(tzinfo=timezone.utc)
    else:
        log_time = log_time.astimezone(timezone.utc)

    now_dt = datetime.now(timezone.utc)
    elapsed = (now_dt - log_time).total_seconds()
    now = now_dt.timestamp()

    if state == "emergency_stop":
        # Rapidly cooling down towards ambient room temperature (293.15 K)
        current_temp = max(293.15, latest_log.temperature - (elapsed * 25.0))
        current_pressure = max(0.5, latest_log.coolant_pressure - (elapsed * 1.5))
        return enrich_telemetry({
            "engine_state": "emergency_stop",
            "thrust_level": 0.0,
            "temperature": round(current_temp, 2),
            "coolant_pressure": round(current_pressure, 2),
            "fuel_flow": 0.0,
            "magnetic_lock": False
        }, elapsed, now)
    
    elif state == "shutdown":
        # Gradual exponential cooling decay towards ambient
        current_temp = 293.15 + (latest_log.temperature - 293.15) * math.exp(-elapsed / 45.0)
        current_pressure = max(1.0, latest_log.coolant_pressure - (elapsed * 0.15))
        return enrich_telemetry({
            "engine_state": "shutdown",
            "thrust_level": 0.0,
            "temperature": round(current_temp, 2),
            "coolant_pressure": round(current_pressure, 2),
            "fuel_flow": 0.0,
            "magnetic_lock": True
        }, elapsed, now)
        
    elif state == "igniting":
        if elapsed >= 10.0:
            # Ramped up to nominal operations
            # Standard smooth deterministic oscillation using sin/cos
            osc = math.sin(now * 0.5) * 2.5
            return enrich_telemetry({
                "engine_state": "nominal",
                "thrust_level": 100.0,
                "temperature": round(1200.0 + osc, 2),
                "coolant_pressure": round(4.5 + math.cos(now * 0.4) * 0.1, 2),
                "fuel_flow": round(24.5 + osc * 0.15, 2),
                "magnetic_lock": True
            }, elapsed, now)
        else:
            # Temperature and parameters ramping up over 10 seconds
            t_percent = elapsed / 10.0
            temp = latest_log.temperature + (1200.0 - latest_log.temperature) * t_percent
            thrust = 100.0 * t_percent
            pressure = latest_log.coolant_pressure + (4.5 - latest_log.coolant_pressure) * t_percent
            flow = 24.5 * t_percent
            return enrich_telemetry({
                "engine_state": "igniting",
                "thrust_level": round(thrust, 2),
                "temperature": round(temp, 2),
                "coolant_pressure": round(pressure, 2),
                "fuel_flow": round(flow, 2),
                "magnetic_lock": True
            }, elapsed, now)
            
    elif state == "nominal":
        thrust_level = latest_log.thrust_level
        thrust_factor = thrust_level / 100.0
        osc = math.sin(now * 0.5) * 2.5
        return enrich_telemetry({
            "engine_state": "nominal",
            "thrust_level": round(thrust_level, 2),
            "temperature": round(293.15 + (1200.0 - 293.15) * thrust_factor + osc, 2),
            "coolant_pressure": round(1.0 + (4.5 - 1.0) * thrust_factor + math.cos(now * 0.4) * 0.1, 2),
            "fuel_flow": round(24.5 * thrust_factor + osc * 0.15, 2),
            "magnetic_lock": True
        }, elapsed, now)
        
    return enrich_telemetry({
        "engine_state": "shutdown",
        "thrust_level": 0.0,
        "temperature": 293.15,
        "coolant_pressure": 1.0,
        "fuel_flow": 0.0,
        "magnetic_lock": True
    }, 0.0, now)


@router.get("", response_model=ApiResponse)
async def engine_base(current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Base diagnostics metadata
    """
    latest = engine_log_repo.get_latest(db)
    current = compute_current_telemetry(latest)
    return make_response(
        success=True,
        message="AETHER Engine base telemetry loaded.",
        data={"reactor_configuration": "Fusion Core MRID-1607X", "current_state": current["engine_state"]}
    )


@router.get("/status", response_model=ApiResponse)
async def get_engine_status(current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Retrieve real-time computed engine status and telemetry metrics.
    Completely database-write side-effect free.
    """
    latest = engine_log_repo.get_latest(db)
    current = compute_current_telemetry(latest)
    return make_response(
        success=True,
        message="Engine core status retrieved successfully.",
        data=current
    )


@router.post("/ignite", response_model=ApiResponse)
async def ignite_engine(current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Trigger engine ignition and warmup startup sequence.
    """
    async with engine_command_lock:
        latest = engine_log_repo.get_latest(db)
        current = compute_current_telemetry(latest)
        current_state = current["engine_state"]
        
        if current_state in ("igniting", "nominal"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Engine is already running or in warmup phase."
            )
        if current_state == "emergency_stop":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reactor is locked in emergency safety state. Clear recovery locks first."
            )

        new_log = EngineLogCreate(
            engine_state="igniting",
            thrust_level=0.0,
            temperature=current["temperature"],
            coolant_pressure=current["coolant_pressure"],
            fuel_flow=0.0,
            magnetic_lock=True
        )
        engine_log_repo.create(db, obj_in=new_log)
        
        logger.info(f"Engine ignition sequence initiated by Commander '{current_commander.username}'")
        return make_response(
            success=True,
            message="Engine ignition sequence successfully initiated.",
            data={"engine_state": "igniting"}
        )


@router.post("/shutdown", response_model=ApiResponse)
async def shutdown_engine(current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Trigger gradual engine shutdown and thermal cooling sequence.
    """
    async with engine_command_lock:
        latest = engine_log_repo.get_latest(db)
        current = compute_current_telemetry(latest)
        current_state = current["engine_state"]
        
        if current_state == "shutdown":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Engine is already shut down."
            )
        if current_state == "emergency_stop":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Reactor is locked in emergency safety state. Clear recovery locks first."
            )

        new_log = EngineLogCreate(
            engine_state="shutdown",
            thrust_level=0.0,
            temperature=current["temperature"],
            coolant_pressure=current["coolant_pressure"],
            fuel_flow=0.0,
            magnetic_lock=True
        )
        engine_log_repo.create(db, obj_in=new_log)
        
        logger.info(f"Engine cooling shutdown initiated by Commander '{current_commander.username}'")
        return make_response(
            success=True,
            message="Engine cooling shutdown initiated.",
            data={"engine_state": "shutdown"}
        )


@router.post("/emergency-stop", response_model=ApiResponse)
async def emergency_stop_engine(current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Instantly cut power and lock reactor core in safe emergency safety bounds.
    """
    async with engine_command_lock:
        latest = engine_log_repo.get_latest(db)
        current = compute_current_telemetry(latest)
        current_state = current["engine_state"]
        
        if current_state == "shutdown":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Engine is already shut down."
            )

        new_log = EngineLogCreate(
            engine_state="emergency_stop",
            thrust_level=0.0,
            temperature=current["temperature"],
            coolant_pressure=12.5, # Pressure release spike
            fuel_flow=0.0,
            magnetic_lock=False # Magnetic suspension lock cut
        )
        engine_log_repo.create(db, obj_in=new_log)
        
        security_logger.warning(f"REACTOR EMERGENCY STOP TRIGGERED by Commander '{current_commander.username}'")
        return make_response(
            success=True,
            message="REACTOR CORE EMERGENCY SHUTDOWN COMPLETED.",
            data={"engine_state": "emergency_stop"}
        )


@router.post("/reset", response_model=ApiResponse)
async def reset_engine(current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Dedicated recovery endpoint to disengage emergency locks and reset state to shutdown.
    """
    async with engine_command_lock:
        latest = engine_log_repo.get_latest(db)
        current = compute_current_telemetry(latest)
        current_state = current["engine_state"]
        
        if current_state != "emergency_stop":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Engine is not in emergency safety lock mode."
            )

        new_log = EngineLogCreate(
            engine_state="shutdown",
            thrust_level=0.0,
            temperature=current["temperature"],
            coolant_pressure=1.0,
            fuel_flow=0.0,
            magnetic_lock=True
        )
        engine_log_repo.create(db, obj_in=new_log)
        
        logger.info(f"Reactor safety lock reset by Commander '{current_commander.username}'")
        return make_response(
            success=True,
            message="Reactor safety lock disengaged and returned to standby shutdown.",
            data={"engine_state": "shutdown"}
        )


class ThrottleRequest(BaseModel):
    thrust_level: float = Field(..., ge=0.0, le=100.0)


@router.post("/throttle", response_model=ApiResponse)
async def throttle_engine(payload: ThrottleRequest, current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Set manual reactor thrust level (0.0 to 100.0%) during nominal operations.
    """
    async with engine_command_lock:
        latest = engine_log_repo.get_latest(db)
        current = compute_current_telemetry(latest)
        current_state = current["engine_state"]
        
        if current_state not in ("igniting", "nominal"):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Manual throttle is only available when the reactor core is igniting or nominal."
            )
            
        new_log = EngineLogCreate(
            engine_state="nominal",
            thrust_level=payload.thrust_level,
            temperature=current["temperature"],
            coolant_pressure=current["coolant_pressure"],
            fuel_flow=current["fuel_flow"],
            magnetic_lock=True
        )
        engine_log_repo.create(db, obj_in=new_log)
        
        logger.info(f"Engine throttle set to {payload.thrust_level}% by Commander '{current_commander.username}'")
        return make_response(
            success=True,
            message=f"Engine throttle adjusted to {payload.thrust_level}%.",
            data={"thrust_level": payload.thrust_level, "engine_state": "nominal"}
        )


@router.get("/logs", response_model=ApiResponse)
async def get_engine_logs(current_commander: Commander = Depends(get_current_commander), db: Session = Depends(get_db)):
    """
    Fetch historical engine logs audit board.
    """
    logs = db.query(EngineLog).order_by(EngineLog.timestamp.desc()).limit(50).all()
    # Map logs manually to output dictionaries
    data_out = []
    for log in logs:
        data_out.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat(),
            "engine_state": log.engine_state,
            "thrust_level": log.thrust_level,
            "temperature": log.temperature,
            "coolant_pressure": log.coolant_pressure,
            "fuel_flow": log.fuel_flow,
            "magnetic_lock": log.magnetic_lock
        })
    return make_response(
        success=True,
        message="Engine audit logs retrieved.",
        data=data_out
    )
