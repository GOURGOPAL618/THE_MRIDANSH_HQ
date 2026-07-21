from pydantic import BaseModel, Field
from typing import Optional

class RadarTargetOut(BaseModel):
    id: str = Field(..., description="Unique target identifier")
    designation: str = Field(..., description="Target name or identifier code")
    bearing: float = Field(..., ge=0.0, le=360.0, description="Bearing angle in degrees (0 to 360)")
    distance: float = Field(..., ge=0.0, le=200.0, description="Distance from radar center in KM")
    speed: float = Field(..., ge=0.0, description="Velocity speed of target (knots)")
    elevation: float = Field(..., ge=0.0, le=90.0, description="Elevation angle in degrees (0 to 90)")
    type: str = Field(..., description="Target classification (e.g., satellite, debris, unidentified)")
    status: str = Field(..., description="Active lock tracking status (e.g., tracked, suspicious, locked)")

    class Config:
        from_attributes = True
