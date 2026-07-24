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

class CommanderLogin(BaseModel):
    username: str
    password: str

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
from pydantic import field_validator
import re

class SettingsBase(BaseModel):
    theme: str = "default"
    volume: float = Field(0.5, ge=0.0, le=1.0)
    is_muted: bool = False
    notifications_enabled: bool = True
    performance_mode: str = "quality"
    
    # Visual Theme Override Columns
    accent_color: Optional[str] = Field(None, description="Accent color hex or keyword override")
    panel_opacity: float = Field(0.85, ge=0.0, le=1.0)
    glow_intensity: float = Field(1.0, ge=0.0, le=2.0)
    animation_speed: float = Field(1.0, ge=0.0, le=3.0)
    border_radius: str = Field("4px", min_length=1, max_length=20)
    font_size: str = Field("14px", min_length=1, max_length=20)

    @field_validator("border_radius")
    @classmethod
    def validate_border_radius(cls, v: str) -> str:
        if not re.match(r"^\d+(\.\d+)?(px|rem|em|%)?$|^0$", v):
            raise ValueError("Invalid border_radius unit style. Must be a valid CSS value like '4px', '0.5rem', or '0'.")
        return v

    @field_validator("font_size")
    @classmethod
    def validate_font_size(cls, v: str) -> str:
        if not re.match(r"^\d+(\.\d+)?(px|rem|em|%)?$", v):
            raise ValueError("Invalid font_size unit style. Must be a valid CSS value like '12px' or '1rem'.")
        return v

    @field_validator("accent_color")
    @classmethod
    def validate_accent_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^#[0-9a-fA-F]{3,6}$|^[a-zA-Z]+$", v):
                raise ValueError("Invalid accent_color. Must be a valid CSS color name or a standard hex color code like '#00FFFF'.")
        return v


class SettingsUpdate(BaseModel):
    theme: Optional[str] = None
    volume: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_muted: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    performance_mode: Optional[str] = None
    
    # Visual Theme Override Columns
    accent_color: Optional[str] = None
    panel_opacity: Optional[float] = Field(None, ge=0.0, le=1.0)
    glow_intensity: Optional[float] = Field(None, ge=0.0, le=2.0)
    animation_speed: Optional[float] = Field(None, ge=0.0, le=3.0)
    border_radius: Optional[str] = None
    font_size: Optional[str] = None

    @field_validator("border_radius")
    @classmethod
    def validate_border_radius_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d+(\.\d+)?(px|rem|em|%)?$|^0$", v):
                raise ValueError("Invalid border_radius unit style. Must be a valid CSS value like '4px', '0.5rem', or '0'.")
        return v

    @field_validator("font_size")
    @classmethod
    def validate_font_size_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^\d+(\.\d+)?(px|rem|em|%)?$", v):
                raise ValueError("Invalid font_size unit style. Must be a valid CSS value like '12px' or '1rem'.")
        return v

    @field_validator("accent_color")
    @classmethod
    def validate_accent_color_opt(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^#[0-9a-fA-F]{3,6}$|^[a-zA-Z]+$", v):
                raise ValueError("Invalid accent_color. Must be a valid CSS color name or a standard hex color code like '#00FFFF'.")
        return v


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

class DatasetUpdate(BaseModel):
    dataset_name: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    source: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)

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


# --- NOTIFICATION SCHEMAS ---
class NotificationBase(BaseModel):
    type: str
    title: str
    message: str

class NotificationCreate(NotificationBase):
    pass

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None

class NotificationOut(NotificationBase):
    id: uuid.UUID
    commander_id: uuid.UUID
    timestamp: datetime
    is_read: bool

    class Config:
        from_attributes = True


# --- SEARCH HISTORY SCHEMAS ---
class RecentSearchBase(BaseModel):
    query: str

class RecentSearchCreate(RecentSearchBase):
    pass

class RecentSearchOut(RecentSearchBase):
    id: uuid.UUID
    commander_id: uuid.UUID
    normalized_query: str
    timestamp: datetime

    class Config:
        from_attributes = True


# --- PINNED RESULT SCHEMAS ---
class PinnedResultBase(BaseModel):
    item_id: str
    item_type: str
    title: str
    url: str

class PinnedResultCreate(PinnedResultBase):
    pass

class PinnedResultOut(PinnedResultBase):
    id: uuid.UUID
    commander_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


