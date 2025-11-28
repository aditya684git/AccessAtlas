"""
CRUD operations for accessibility tags
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Dict, Optional
import logging
from models import AccessibilityTag, TagSource
from schemas import TagCreate, TagResponse

logger = logging.getLogger(__name__)

def create_tags(
    db: Session,
    location_name: str,
    location_lat: float,
    location_lon: float,
    tags: List[TagCreate]
) -> List[AccessibilityTag]:
    """
    Create multiple accessibility tags for a location
    
    Args:
        db: Database session
        location_name: Name of the location
        location_lat: Latitude of location center
        location_lon: Longitude of location center
        tags: List of tags to create
    
    Returns:
        List of created AccessibilityTag objects
    """
    created_tags = []
    
    try:
        for tag_data in tags:
            db_tag = AccessibilityTag(
                location_name=location_name,
                lat=tag_data.lat,
                lon=tag_data.lon,
                tag_type=tag_data.type.value,
                source=tag_data.source.value,
                address=tag_data.address,
                confidence=tag_data.confidence,
                osm_id=tag_data.osm_id,
                notes=tag_data.notes
            )
            db.add(db_tag)
            created_tags.append(db_tag)
        
        db.commit()
        
        # Refresh to get IDs and timestamps
        for tag in created_tags:
            db.refresh(tag)
        
        logger.info(f"Created {len(created_tags)} tags for location: {location_name}")
        return created_tags
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating tags: {str(e)}")
        raise

def get_tags_by_location(
    db: Session,
    location_name: str,
    radius_km: Optional[float] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None
) -> Dict[str, List[AccessibilityTag]]:
    """
    Get all tags for a location, grouped by source
    
    Args:
        db: Database session
        location_name: Name of the location
        radius_km: Optional radius in km for proximity search
        lat: Optional center latitude for proximity search
        lon: Optional center longitude for proximity search
    
    Returns:
        Dictionary with tags grouped by source (user, osm, model)
    """
    try:
        query = db.query(AccessibilityTag)
        
        if radius_km and lat and lon:
            # Haversine formula for distance calculation
            # Simplified: 1 degree ≈ 111km at equator
            degree_radius = radius_km / 111.0
            query = query.filter(
                and_(
                    AccessibilityTag.lat.between(lat - degree_radius, lat + degree_radius),
                    AccessibilityTag.lon.between(lon - degree_radius, lon + degree_radius)
                )
            )
        else:
            # Exact location name match
            query = query.filter(AccessibilityTag.location_name == location_name)
        
        all_tags = query.order_by(AccessibilityTag.created_at.desc()).all()
        
        # Group by source
        grouped = {
            TagSource.user.value: [],
            TagSource.osm.value: [],
            TagSource.model.value: []
        }
        
        for tag in all_tags:
            grouped[tag.source.value].append(tag)
        
        logger.info(f"Retrieved {len(all_tags)} tags for location: {location_name}")
        return grouped
    
    except Exception as e:
        logger.error(f"Error retrieving tags: {str(e)}")
        raise

def get_all_locations(db: Session) -> List[Dict]:
    """
    Get all unique locations with tag counts
    
    Returns:
        List of dictionaries with location info
    """
    try:
        results = db.query(
            AccessibilityTag.location_name,
            AccessibilityTag.lat,
            AccessibilityTag.lon,
            func.count(AccessibilityTag.id).label('tag_count')
        ).group_by(
            AccessibilityTag.location_name,
            AccessibilityTag.lat,
            AccessibilityTag.lon
        ).all()
        
        locations = [
            {
                "location_name": r.location_name,
                "lat": r.lat,
                "lon": r.lon,
                "tag_count": r.tag_count
            }
            for r in results
        ]
        
        logger.info(f"Retrieved {len(locations)} unique locations")
        return locations
    
    except Exception as e:
        logger.error(f"Error retrieving locations: {str(e)}")
        raise

def delete_tag(db: Session, tag_id: int) -> bool:
    """
    Delete a tag by ID
    
    Args:
        db: Database session
        tag_id: ID of tag to delete
    
    Returns:
        True if deleted, False if not found
    """
    try:
        tag = db.query(AccessibilityTag).filter(AccessibilityTag.id == tag_id).first()
        if tag:
            db.delete(tag)
            db.commit()
            logger.info(f"Deleted tag with ID: {tag_id}")
            return True
        return False
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting tag: {str(e)}")
        raise

def get_tag_statistics(db: Session) -> Dict:
    """
    Get overall statistics about tags
    
    Returns:
        Dictionary with statistics
    """
    try:
        total_tags = db.query(func.count(AccessibilityTag.id)).scalar()
        
        by_source = db.query(
            AccessibilityTag.source,
            func.count(AccessibilityTag.id)
        ).group_by(AccessibilityTag.source).all()
        
        by_type = db.query(
            AccessibilityTag.tag_type,
            func.count(AccessibilityTag.id)
        ).group_by(AccessibilityTag.tag_type).all()
        
        stats = {
            "total_tags": total_tags,
            "by_source": {str(source): count for source, count in by_source},
            "by_type": {str(tag_type): count for tag_type, count in by_type}
        }
        
        logger.info(f"Generated statistics: {stats}")
        return stats
    
    except Exception as e:
        logger.error(f"Error generating statistics: {str(e)}")
        raise
