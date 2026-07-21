import uuid
from datetime import datetime
from pydantic import BaseModel, Field

class BookmarkCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Name of the bookmarked location")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude of the location (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude of the location (-180 to 180)")
    altitude: float = Field(default=100000.0, ge=0.0, description="Altitude/zoom level (non-negative)")

class BookmarkCreateDB(BookmarkCreate):
    commander_id: uuid.UUID

class BookmarkOut(BaseModel):
    id: uuid.UUID
    commander_id: uuid.UUID
    name: str
    latitude: float
    longitude: float
    altitude: float
    created_at: datetime

    class Config:
        from_attributes = True
