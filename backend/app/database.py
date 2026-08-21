from sqlalchemy import create_engine, Column, Integer, String, Enum, ForeignKey, Text, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./notesheet.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Prof(Base):
    __tablename__ = 'profs'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    position = Column(String(100))

class ApprovalStage(Base):
    __tablename__ = 'approval_stages'
    id = Column(Integer, primary_key=True)
    notesheet_id = Column(Integer, nullable=False)
    stage_order = Column(Integer, nullable=False)

class StageApprover(Base):
    __tablename__ = 'stage_approvers'
    stage_id = Column(Integer, ForeignKey('approval_stages.id'), primary_key=True)
    prof_id = Column(Integer, ForeignKey('profs.id'), primary_key=True)
    status = Column(Enum('pending', 'approved', 'rejected', name='status_enum'), default='pending')
    approved_at = Column(TIMESTAMP, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    prof = relationship("Prof")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()