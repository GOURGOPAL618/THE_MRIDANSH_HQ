import uuid
from datetime import datetime
from typing import List, Optional, Any
from sqlalchemy import String, Boolean, Float, DateTime, Text, JSON, ForeignKey, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.database.session import Base

class Commander(Base):
    __tablename__ = "commanders"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="commander", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    sessions: Mapped[List["CommanderSession"]] = relationship("CommanderSession", back_populates="commander", cascade="all, delete-orphan")
    settings: Mapped["Settings"] = relationship("Settings", back_populates="commander", uselist=False, cascade="all, delete-orphan")
    bookmarks: Mapped[List["EarthBookmark"]] = relationship("EarthBookmark", back_populates="commander", cascade="all, delete-orphan")
    notifications: Mapped[List["Notification"]] = relationship("Notification", back_populates="commander", cascade="all, delete-orphan")


class CommanderSession(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    commander_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("commanders.id", ondelete="CASCADE"), index=True, nullable=False)
    login_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    logout_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)  # IPv6 compatible size
    browser: Mapped[str] = mapped_column(String(100), nullable=False)
    device: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, terminated, expired

    # Relationships
    commander: Mapped["Commander"] = relationship("Commander", back_populates="sessions")


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    commander_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("commanders.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    theme: Mapped[str] = mapped_column(String(20), default="default", nullable=False)
    volume: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    performance_mode: Mapped[str] = mapped_column(String(20), default="quality", nullable=False)  # quality, performance

    # Relationships
    commander: Mapped["Commander"] = relationship("Commander", back_populates="settings")


class ActivityLog(Base):
    __tablename__ = "logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    module: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="info", nullable=False)  # info, warning, error, security, mission


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    event: Mapped[str] = mapped_column(String(100), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)  # low, medium, high, critical
    details: Mapped[str] = mapped_column(Text, nullable=False)


class EngineLog(Base):
    __tablename__ = "engine_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    engine_state: Mapped[str] = mapped_column(String(20), nullable=False)  # shutdown, igniting, nominal, overheating, emergency_stop
    thrust_level: Mapped[float] = mapped_column(Float, nullable=False)  # 0.0 to 100.0
    temperature: Mapped[float] = mapped_column(Float, nullable=False)  # Kelvin
    coolant_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    fuel_flow: Mapped[float] = mapped_column(Float, nullable=False)
    magnetic_lock: Mapped[bool] = mapped_column(Boolean, nullable=False)


class Research(Base):
    __tablename__ = "research"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Any] = mapped_column(JSON, nullable=False)  # List of tags (strings)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    dataset_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)  # file storage path
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)  # draft, active, completed, failed
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class EarthBookmark(Base):
    __tablename__ = "earth_bookmarks"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    commander_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("commanders.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    altitude: Mapped[float] = mapped_column(Float, nullable=False, default=100000.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    commander: Mapped["Commander"] = relationship("Commander", back_populates="bookmarks")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    commander_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("commanders.id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # success, warning, error, info, security, engine, dataset, etc.
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)

    # Relationships
    commander: Mapped["Commander"] = relationship("Commander", back_populates="notifications")

