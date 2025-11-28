"""
FastAPI routes for accessibility tags storage and retrieval
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
import logging

from database import get_db
from schemas import (
    TagsRequest,
    TagsGroupedResponse,
    StoreTagsResponse,
    TagResponse,
    TagSource
)
from crud import (
    create_tags,
    get_tags_by_location,
    get_all_locations,
    delete_tag,
    get_tag_statistics
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.post("/store", response_model=StoreTagsResponse, status_code=status.HTTP_201_CREATED)
async def store_tags(
    request: TagsRequest,
    db: Session = Depends(get_db)
):
    """
    Store accessibility tags for a location
    
    **Request Body:**
    - location_name: Name of the location (e.g., "Clemson University")
    - lat: Center latitude of location
    - lon: Center longitude of location
    - tags: List of tags with type, coordinates, source, and optional metadata
    
    **Response:**
    - success: Boolean indicating success
    - message: Success message
    - location_name: Location name
    - tags_stored: Number of tags stored
    - tag_ids: List of created tag IDs
    """
    try:
        logger.info(f"Storing {len(request.tags)} tags for location: {request.location_name}")
        
        # Validate tags
        if not request.tags:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one tag must be provided"
            )
        
        # Create tags in database
        created_tags = create_tags(
            db=db,
            location_name=request.location_name,
            location_lat=request.lat,
            location_lon=request.lon,
            tags=request.tags
        )
        
        tag_ids = [tag.id for tag in created_tags]
        
        logger.info(f"Successfully stored {len(tag_ids)} tags with IDs: {tag_ids}")
        
        return StoreTagsResponse(
            success=True,
            message=f"Successfully stored {len(tag_ids)} tags",
            location_name=request.location_name,
            tags_stored=len(tag_ids),
            tag_ids=tag_ids
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error storing tags: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store tags: {str(e)}"
        )

@router.get("/location/{location_name}", response_model=TagsGroupedResponse)
async def get_tags(
    location_name: str,
    radius_km: float = None,
    lat: float = None,
    lon: float = None,
    db: Session = Depends(get_db)
):
    """
    Get all accessibility tags for a location, grouped by source
    
    **Path Parameters:**
    - location_name: Name of the location
    
    **Query Parameters (optional):**
    - radius_km: Search radius in kilometers
    - lat: Center latitude for proximity search
    - lon: Center longitude for proximity search
    
    **Response:**
    - location_name: Location name
    - lat: Center latitude
    - lon: Center longitude
    - total_tags: Total number of tags
    - tags: Dictionary grouped by source (user, osm, model)
    """
    try:
        logger.info(f"Retrieving tags for location: {location_name}")
        
        # Get tags grouped by source
        grouped_tags = get_tags_by_location(
            db=db,
            location_name=location_name,
            radius_km=radius_km,
            lat=lat,
            lon=lon
        )
        
        # Convert to response format with proper field mapping
        def db_tag_to_response(tag):
            """Convert database tag to response schema"""
            return TagResponse(
                id=tag.id,
                tag_type=tag.tag_type.value,
                lat=tag.lat,
                lon=tag.lon,
                source=tag.source,
                address=tag.address,
                confidence=tag.confidence,
                osm_id=tag.osm_id,
                notes=tag.notes,
                created_at=tag.created_at,
                updated_at=tag.updated_at
            )
        
        response_tags: Dict[TagSource, List[TagResponse]] = {
            TagSource.user: [db_tag_to_response(tag) for tag in grouped_tags[TagSource.user.value]],
            TagSource.osm: [db_tag_to_response(tag) for tag in grouped_tags[TagSource.osm.value]],
            TagSource.model: [db_tag_to_response(tag) for tag in grouped_tags[TagSource.model.value]]
        }
        
        total_tags = sum(len(tags) for tags in response_tags.values())
        
        # Use provided lat/lon or get from first tag
        response_lat = lat
        response_lon = lon
        if not response_lat or not response_lon:
            all_tags = grouped_tags[TagSource.user.value] + grouped_tags[TagSource.osm.value] + grouped_tags[TagSource.model.value]
            if all_tags:
                response_lat = all_tags[0].lat
                response_lon = all_tags[0].lon
            else:
                response_lat = 0.0
                response_lon = 0.0
        
        logger.info(f"Retrieved {total_tags} tags (user: {len(response_tags[TagSource.user])}, osm: {len(response_tags[TagSource.osm])}, model: {len(response_tags[TagSource.model])})")
        
        return TagsGroupedResponse(
            location_name=location_name,
            lat=response_lat,
            lon=response_lon,
            total_tags=total_tags,
            tags=response_tags
        )
    
    except Exception as e:
        logger.error(f"Error retrieving tags: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve tags: {str(e)}"
        )

@router.get("/locations", response_model=List[Dict])
async def list_locations(db: Session = Depends(get_db)):
    """
    Get all unique locations with tag counts
    
    **Response:**
    List of locations with:
    - location_name: Name of location
    - lat: Latitude
    - lon: Longitude
    - tag_count: Number of tags at this location
    """
    try:
        locations = get_all_locations(db)
        logger.info(f"Retrieved {len(locations)} locations")
        return locations
    
    except Exception as e:
        logger.error(f"Error listing locations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list locations: {str(e)}"
        )

@router.delete("/tag/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag_by_id(
    tag_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a tag by ID
    
    **Path Parameters:**
    - tag_id: ID of the tag to delete
    """
    try:
        deleted = delete_tag(db, tag_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tag with ID {tag_id} not found"
            )
        logger.info(f"Deleted tag with ID: {tag_id}")
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting tag: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete tag: {str(e)}"
        )

@router.get("/statistics", response_model=Dict)
async def get_statistics(db: Session = Depends(get_db)):
    """
    Get overall statistics about tags
    
    **Response:**
    - total_tags: Total number of tags
    - by_source: Tag counts grouped by source
    - by_type: Tag counts grouped by type
    """
    try:
        stats = get_tag_statistics(db)
        logger.info(f"Retrieved statistics: {stats}")
        return stats
    
    except Exception as e:
        logger.error(f"Error getting statistics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )
