# app/database.py
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

Base = declarative_base()

class Notesheet(Base):
    __tablename__ = 'notesheets'
    
    id = Column(String, primary_key=True)
    request_text = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    draft_text = Column(Text, nullable=False)
    status = Column(String, nullable=False)  # draft, approved, rejected
    approvals = Column(JSON, default=[])
    created_at = Column(DateTime, server_default='CURRENT_TIMESTAMP')
    updated_at = Column(DateTime, onupdate='CURRENT_TIMESTAMP')

# SQLite setup
DATABASE_URL = "sqlite:///C:/Users/Kushagr/Documents/NotesheetAI/backend/app/notesheets.db"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(engine)

def seed_db():
    from .seed import seed_data
    seed_data()

if __name__ == "__main__":
    init_db()