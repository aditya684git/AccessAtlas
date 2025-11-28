"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./accessibility_tags.db")

# Create engine
# For SQLite: check_same_thread=False allows FastAPI to work with SQLite
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """
    Dependency to get database session
    Yields session and ensures it's closed after request
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """
    Initialize database tables
    Call this on app startup
    """
    Base.metadata.create_all(bind=engine)
