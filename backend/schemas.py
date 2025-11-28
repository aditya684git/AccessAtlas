"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum

class TagSource(str, Enum):
    """Tag source enum"""
    user = "user"
    osm = "osm"
    model = "model"

class TagType(str, Enum):
    """Tag type enum"""
    Ramp = "Ramp"
    Elevator = "Elevator"
    Entrance = "Entrance"
    TactilePath = "Tactile Path"
    Obstacle = "Obstacle"
    Parking = "Parking"
    Restroom = "Restroom"

class TagCreate(BaseModel):
    """Schema for creating a single tag"""
    type: TagType = Field(..., description="Type of accessibility feature")
    lat: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    lon: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    source: TagSource = Field(..., description="Source of the tag")
    address: Optional[str] = Field(None, description="Human-readable address")
    confidence: Optional[float] = Field(None, ge=0, le=1, description="Confidence score for model tags")
    osm_id: Optional[str] = Field(None, description="OpenStreetMap ID")
    notes: Optional[str] = Field(None, description="Additional notes")

    @field_validator('confidence')
    @classmethod
    def validate_confidence(cls, v, info):
        """Confidence should only be set for model-generated tags"""
        if v is not None:
            source = info.data.get('source')
            if source != TagSource.model:
                raise ValueError("Confidence can only be set for model-generated tags")
        return v

    @field_validator('osm_id')
    @classmethod
    def validate_osm_id(cls, v, info):
        """OSM ID should only be set for OSM tags"""
        if v is not None:
            source = info.data.get('source')
            if source != TagSource.osm:
                raise ValueError("OSM ID can only be set for OSM-sourced tags")
        return v

class TagsRequest(BaseModel):
    """Request schema for storing tags"""
    location_name: str = Field(..., min_length=1, description="Name of the location")
    lat: float = Field(..., ge=-90, le=90, description="Center latitude of location")
    lon: float = Field(..., ge=-180, le=180, description="Center longitude of location")
    tags: List[TagCreate] = Field(..., min_length=1, description="List of tags to store")

    class Config:
        json_schema_extra = {
            "example": {
                "location_name": "Clemson University",
                "lat": 34.6834,
                "lon": -82.8374,
                "tags": [
                    {
                        "type": "Ramp",
                        "lat": 34.6835,
                        "lon": -82.8375,
                        "source": "user",
                        "address": "Cooper Library"
                    },
                    {
                        "type": "Elevator",
                        "lat": 34.6840,
                        "lon": -82.8380,
                        "source": "osm",
                        "osm_id": "123456",
                        "address": "Brackett Hall"
                    }
                ]
            }
        }

class TagResponse(BaseModel):
    """Response schema for a single tag"""
    id: int
    tag_type: str = Field(alias="type")  # Map tag_type to type in response
    lat: float
    lon: float
    source: TagSource
    address: Optional[str] = None
    confidence: Optional[float] = None
    osm_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True  # Allow using both tag_type and type

class TagsGroupedResponse(BaseModel):
    """Response schema for grouped tags by source"""
    location_name: str
    lat: float
    lon: float
    total_tags: int
    tags: Dict[TagSource, List[TagResponse]] = Field(
        default_factory=lambda: {
            TagSource.user: [],
            TagSource.osm: [],
            TagSource.model: []
        }
    )

    class Config:
        json_schema_extra = {
            "example": {
                "location_name": "Clemson University",
                "lat": 34.6834,
                "lon": -82.8374,
                "total_tags": 3,
                "tags": {
                    "user": [
                        {
                            "id": 1,
                            "type": "Ramp",
                            "lat": 34.6835,
                            "lon": -82.8375,
                            "source": "user",
                            "address": "Cooper Library",
                            "created_at": "2025-11-27T10:00:00Z"
                        }
                    ],
                    "osm": [
                        {
                            "id": 2,
                            "type": "Elevator",
                            "lat": 34.6840,
                            "lon": -82.8380,
                            "source": "osm",
                            "osm_id": "123456",
                            "address": "Brackett Hall",
                            "created_at": "2025-11-27T10:05:00Z"
                        }
                    ],
                    "model": []
                }
            }
        }

class StoreTagsResponse(BaseModel):
    """Response after storing tags"""
    success: bool
    message: str
    location_name: str
    tags_stored: int
    tag_ids: List[int]
