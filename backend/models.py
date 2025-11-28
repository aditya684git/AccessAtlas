"""
SQLAlchemy ORM models for database tables
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from database import Base
import enum

class TagSource(str, enum.Enum):
    """Tag source enum"""
    user = "user"
    osm = "osm"
    model = "model"

class TagType(str, enum.Enum):
    """Tag type enum"""
    ramp = "Ramp"
    elevator = "Elevator"
    entrance = "Entrance"
    tactile_path = "Tactile Path"
    obstacle = "Obstacle"
    parking = "Parking"
    restroom = "Restroom"

class AccessibilityTag(Base):
    """
    SQLAlchemy model for accessibility tags
    """
    __tablename__ = "accessibility_tags"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Location info
    location_name = Column(String, index=True, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    
    # Tag info
    tag_type = Column(SQLEnum(TagType), nullable=False)
    source = Column(SQLEnum(TagSource), nullable=False, index=True)
    
    # Optional metadata
    address = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)  # For model-generated tags
    osm_id = Column(String, nullable=True)  # For OSM tags
    notes = Column(String, nullable=True)  # User notes
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<AccessibilityTag(id={self.id}, type={self.tag_type}, source={self.source}, location={self.location_name})>"
