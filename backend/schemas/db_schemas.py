from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import List, Optional, Any
import uuid

# --- COMMANDER SCHEMAS ---
class CommanderBase(BaseModel):
    username: str = Field(..., max_length=50)
    email: EmailStr

class CommanderCreate(CommanderBase):
    password: str = Field(..., min_length=8, max_length=100)

class CommanderUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)

class CommanderOut(CommanderBase):
    id: uuid.UUID
    role: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- SESSION SCHEMAS ---
class SessionBase(BaseModel):
    ip_address: str
    browser: str
    device: str

class SessionCreate(SessionBase):
    commander_id: uuid.UUID
    status: str = "active"

class SessionOut(SessionBase):
    id: uuid.UUID
    commander_id: uuid.UUID
    login_time: datetime
    logout_time: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True


# --- SETTINGS SCHEMAS ---
class SettingsBase(BaseModel):
    theme: str = "default"
    volume: float = Field(0.5, ge=0.0, le=1.0)
    is_muted: bool = False
    notifications_enabled: bool = True
    performance_mode: str = "quality"

class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    volume: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_muted: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    performance_mode: Optional[str] = None

class SettingsOut(SettingsBase):
    id: uuid.UUID
    commander_id: uuid.UUID

    class Config:
        from_attributes = True


# --- ACTIVITY LOG SCHEMAS ---
class ActivityLogBase(BaseModel):
    module: str
    action: str
    description: str
    severity: str = "info"

class ActivityLogCreate(ActivityLogBase):
    pass

class ActivityLogOut(ActivityLogBase):
    id: uuid.UUID
    timestamp: datetime

    class Config:
        from_attributes = True


# --- SECURITY EVENT SCHEMAS ---
class SecurityEventBase(BaseModel):
    event: str
    risk_level: str
    details: str

class SecurityEventCreate(SecurityEventBase):
    pass

class SecurityEventOut(SecurityEventBase):
    id: uuid.UUID
    timestamp: datetime

    class Config:
        from_attributes = True


# --- ENGINE LOG SCHEMAS ---
class EngineLogBase(BaseModel):
    engine_state: str
    thrust_level: float = Field(..., ge=0.0, le=100.0)
    temperature: float = Field(..., ge=0.0)
    coolant_pressure: float
    fuel_flow: float
    magnetic_lock: bool

class EngineLogCreate(EngineLogBase):
    pass

class EngineLogOut(EngineLogBase):
    id: uuid.UUID
    timestamp: datetime

    class Config:
        from_attributes = True


# --- RESEARCH SCHEMAS ---
class ResearchBase(BaseModel):
    title: str = Field(..., max_length=255)
    category: str = Field(..., max_length=100)
    description: str
    tags: List[str] = []

class ResearchCreate(ResearchBase):
    pass

class ResearchUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    tags: Optional[List[str]] = None

class ResearchOut(ResearchBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- DATASET SCHEMAS ---
class DatasetBase(BaseModel):
    dataset_name: str = Field(..., max_length=255)
    category: str = Field(..., max_length=100)
    source: str = Field(..., max_length=255)
    description: str
    location: str

class DatasetCreate(DatasetBase):
    pass

class DatasetOut(DatasetBase):
    id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


# --- EXPERIMENT SCHEMAS ---
class ExperimentBase(BaseModel):
    title: str = Field(..., max_length=255)
    objective: str
    status: str = "draft"
    notes: Optional[str] = None

class ExperimentCreate(ExperimentBase):
    pass

class ExperimentUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    objective: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ExperimentOut(ExperimentBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
