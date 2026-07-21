import time
from fastapi import APIRouter, Depends
from backend.schemas.responses import ApiResponse, make_response
from backend.security.auth_deps import get_current_commander
from backend.models.models import Commander

router = APIRouter()

@router.get("", response_model=ApiResponse)
async def radar_base(current_commander: Commander = Depends(get_current_commander)):
    """
    Base endpoint placeholder for Radar target sweep systems
    """
    return make_response(
        success=True,
        message="Radar coordinates scans base.",
        data={"scanning_mode": "active", "bands_configured": 4}
    )

@router.get("/targets", response_model=ApiResponse)
async def get_targets(current_commander: Commander = Depends(get_current_commander)):
    """
    Fetch dynamically moving simulated radar targets from the backend telemetry.
    The positions animate deterministically using the current timestamp.
    """
    now = time.time()
    
    # Define 6 simulated targets with different velocities, headings, and orbits
    raw_targets = [
        {
            "id": "TGT-A1",
            "designation": "SAT-08A (AETHER)",
            "base_bearing": 45.0,
            "base_distance": 120.0,
            "speed": 450.0,      # knots
            "elevation": 35.5,   # degrees
            "bearing_drift": 2.0, # degrees per minute
            "distance_drift": -0.5, # km per minute
            "type": "satellite",
            "status": "tracked"
        },
        {
            "id": "TGT-B2",
            "designation": "METEO-4 (WEATHER)",
            "base_bearing": 120.0,
            "base_distance": 75.0,
            "speed": 85.0,
            "elevation": 12.0,
            "bearing_drift": 0.5,
            "distance_drift": 0.2,
            "type": "meteorological",
            "status": "tracked"
        },
        {
            "id": "TGT-C3",
            "designation": "DEBRIS-X9",
            "base_bearing": 280.0,
            "base_distance": 180.0,
            "speed": 980.0,
            "elevation": 58.2,
            "bearing_drift": -5.0,
            "distance_drift": -1.2,
            "type": "debris",
            "status": "suspicious"
        },
        {
            "id": "TGT-D4",
            "designation": "AIRCRAFT-202",
            "base_bearing": 195.0,
            "base_distance": 40.0,
            "speed": 320.0,
            "elevation": 8.5,
            "bearing_drift": 3.5,
            "distance_drift": 1.5,
            "type": "aircraft",
            "status": "tracked"
        },
        {
            "id": "TGT-E5",
            "designation": "UNKNOWN-09",
            "base_bearing": 340.0,
            "base_distance": 150.0,
            "speed": 0.0,
            "elevation": 0.1,
            "bearing_drift": 0.0,
            "distance_drift": 0.0,
            "type": "unidentified",
            "status": "locked"
        },
        {
            "id": "TGT-F6",
            "designation": "ISS-ORBITER",
            "base_bearing": 15.0,
            "base_distance": 195.0,
            "speed": 17500.0,
            "elevation": 82.4,
            "bearing_drift": 15.0,
            "distance_drift": -5.0,
            "type": "satellite",
            "status": "tracked"
        }
    ]
    
    targets_out = []
    for tgt in raw_targets:
        # Calculate elapsed minutes to update positions deterministically
        # Using a reference timestamp to anchor the simulation loop
        elapsed_minutes = (now % 3600) / 60.0
        
        # Calculate current bearing (wrap around 0 to 360)
        current_bearing = (tgt["base_bearing"] + (tgt["bearing_drift"] * elapsed_minutes)) % 360.0
        
        # Calculate current distance (bounce between 5km and 195km if drifting off bounds)
        raw_distance = tgt["base_distance"] + (tgt["distance_drift"] * elapsed_minutes)
        current_distance = 5.0 + (raw_distance % 190.0)
        
        targets_out.append({
            "id": tgt["id"],
            "designation": tgt["designation"],
            "bearing": round(current_bearing, 2),
            "distance": round(current_distance, 2),
            "speed": tgt["speed"],
            "elevation": tgt["elevation"],
            "type": tgt["type"],
            "status": tgt["status"]
        })
        
    return make_response(
        success=True,
        message="Radar targets retrieved successfully.",
        data=targets_out
    )
