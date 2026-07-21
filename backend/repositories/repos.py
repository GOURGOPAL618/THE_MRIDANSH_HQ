from typing import List, Optional
import uuid
from sqlalchemy.orm import Session
from backend.repositories.base_repo import BaseRepository
from backend.models.models import (
    Commander,
    CommanderSession,
    Settings,
    ActivityLog,
    SecurityEvent,
    EngineLog,
    Research,
    Dataset,
    Experiment,
    EarthBookmark
)
from backend.schemas.db_schemas import (
    CommanderCreate, CommanderUpdate,
    SessionCreate,
    SettingsBase, SettingsUpdate,
    ActivityLogCreate,
    SecurityEventCreate,
    EngineLogCreate,
    ResearchCreate, ResearchUpdate,
    DatasetCreate,
    ExperimentCreate, ExperimentUpdate
)

class CommanderRepository(BaseRepository[Commander, CommanderCreate, CommanderUpdate]):
    def get_by_username(self, db: Session, username: str) -> Optional[Commander]:
        return db.query(self.model).filter(self.model.username == username).first()

    def get_by_email(self, db: Session, email: str) -> Optional[Commander]:
        return db.query(self.model).filter(self.model.email == email).first()


class SessionRepository(BaseRepository[CommanderSession, SessionCreate, Any := None]):
    def get_active_by_commander(self, db: Session, commander_id: uuid.UUID) -> List[CommanderSession]:
        return db.query(self.model).filter(
            self.model.commander_id == commander_id,
            self.model.status == "active"
        ).all()


class SettingsRepository(BaseRepository[Settings, SettingsBase, SettingsUpdate]):
    def get_by_commander(self, db: Session, commander_id: uuid.UUID) -> Optional[Settings]:
        return db.query(self.model).filter(self.model.commander_id == commander_id).first()


class LogRepository(BaseRepository[ActivityLog, ActivityLogCreate, Any := None]):
    def get_by_module(self, db: Session, module: str, *, skip: int = 0, limit: int = 100) -> List[ActivityLog]:
        return db.query(self.model).filter(self.model.module == module).order_by(self.model.timestamp.desc()).offset(skip).limit(limit).all()


class SecurityEventRepository(BaseRepository[SecurityEvent, SecurityEventCreate, Any := None]):
    def get_high_risk(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[SecurityEvent]:
        return db.query(self.model).filter(
            self.model.risk_level.in_(["high", "critical"])
        ).order_by(self.model.timestamp.desc()).offset(skip).limit(limit).all()


class EngineLogRepository(BaseRepository[EngineLog, EngineLogCreate, Any := None]):
    def get_latest(self, db: Session) -> Optional[EngineLog]:
        return db.query(self.model).order_by(self.model.timestamp.desc()).first()


class ResearchRepository(BaseRepository[Research, ResearchCreate, ResearchUpdate]):
    def get_by_category(self, db: Session, category: str) -> List[Research]:
        return db.query(self.model).filter(self.model.category == category).all()


class DatasetRepository(BaseRepository[Dataset, DatasetCreate, Any := None]):
    def get_by_name(self, db: Session, dataset_name: str) -> Optional[Dataset]:
        return db.query(self.model).filter(self.model.dataset_name == dataset_name).first()


class ExperimentRepository(BaseRepository[Experiment, ExperimentCreate, ExperimentUpdate]):
    def get_by_status(self, db: Session, status: str) -> List[Experiment]:
        return db.query(self.model).filter(self.model.status == status).all()


class EarthBookmarkRepository(BaseRepository[EarthBookmark, Any := Any, Any := Any]):
    def get_by_commander(self, db: Session, commander_id: uuid.UUID) -> List[EarthBookmark]:
        return db.query(self.model).filter(self.model.commander_id == commander_id).order_by(self.model.created_at.desc()).all()

    def get_by_commander_and_id(self, db: Session, commander_id: uuid.UUID, bookmark_id: uuid.UUID) -> Optional[EarthBookmark]:
        return db.query(self.model).filter(
            self.model.commander_id == commander_id,
            self.model.id == bookmark_id
        ).first()


# Instantiate repositories for global import
commander_repo = CommanderRepository(Commander)
session_repo = SessionRepository(CommanderSession)
settings_repo = SettingsRepository(Settings)
log_repo = LogRepository(ActivityLog)
security_event_repo = SecurityEventRepository(SecurityEvent)
engine_log_repo = EngineLogRepository(EngineLog)
research_repo = ResearchRepository(Research)
dataset_repo = DatasetRepository(Dataset)
experiment_repo = ExperimentRepository(Experiment)
bookmark_repo = EarthBookmarkRepository(EarthBookmark)
