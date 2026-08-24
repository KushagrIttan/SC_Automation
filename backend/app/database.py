from sqlalchemy import create_engine, Boolean, Column, Integer, String, Enum, ForeignKey, TIMESTAMP, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime, timezone
import os

SQLALCHEMY_DATABASE_URL = "sqlite:///" + os.path.join(
    os.path.dirname(__file__), "..", "notesheet.db"
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


ROLES = ('student', 'club_lead', 'prof', 'dean', 'admin')


class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(160), unique=True, nullable=False, index=True)
    name = Column(String(140), nullable=False)
    password_hash = Column(String(300), nullable=False)   # "<salt>$<pbkdf2 hex>"
    role = Column(Enum(*ROLES, name='user_role'), nullable=False)
    department = Column(String(140), nullable=True)
    position = Column(String(140), nullable=True)
    # Base64 data-URL PNG drawn at signup (prof / dean / club_lead only).
    signature_png = Column(Text, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP, nullable=False, default=_utcnow)


class Prof(Base):
    """Legacy directory kept for historical rows; approvers are Users now."""
    __tablename__ = 'profs'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    position = Column(String(100))


class ApprovalStage(Base):
    __tablename__ = 'approval_stages'
    id = Column(Integer, primary_key=True)
    notesheet_id = Column(String(50), nullable=False)   # matches Notesheet.id (string)
    stage_order = Column(Integer, nullable=False)
    name = Column(String(120), nullable=False, default="")

    stage_approvers = relationship(
        "StageApprover", backref="stage", cascade="all, delete-orphan"
    )


class StageApprover(Base):
    __tablename__ = 'stage_approvers'
    stage_id = Column(Integer, ForeignKey('approval_stages.id'), primary_key=True)
    # approver user id (users table); column kept as prof_id for continuity
    prof_id = Column(Integer, ForeignKey('users.id'), primary_key=True)
    status = Column(Enum('pending', 'approved', 'rejected', name='status_enum'), default='pending')
    approved_at = Column(TIMESTAMP, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    user = relationship("User")


class Notesheet(Base):
    """Stores every generated notesheet so the list/detail pages show real data."""
    __tablename__ = 'notesheets'
    id = Column(String(50), primary_key=True)
    category = Column(String(50), nullable=False)
    request_text = Column(Text, nullable=False)
    draft_text = Column(Text, nullable=False)
    draft_source = Column(String(20), nullable=False, default='ollama')
    status = Column(String(30), nullable=False, default='draft')
    amount = Column(Float, nullable=True)
    requester_name = Column(String(120), nullable=True)
    department = Column(String(120), nullable=True)
    requester_id = Column(Integer, nullable=True)   # users.id of the submitting owner
    precedents_json = Column(Text, nullable=True)   # JSON string
    rules_json = Column(Text, nullable=True)         # JSON string
    approval_chain_json = Column(Text, nullable=True) # JSON string
    documents_missing_json = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP, nullable=False, default=_utcnow)
    updated_at = Column(TIMESTAMP, nullable=False, default=_utcnow, onupdate=_utcnow)


# Create tables on import
Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
