"""
Fetch OSM Accessibility Tags

This script queries the Overpass API to fetch real-world accessibility features
from OpenStreetMap and formats them as tag objects for the map interface.

Usage:
    python fetch_osm_tags.py --lat 34.67 --lon -82.48 --radius 5000 \
                              --output ../data/osm_tags.json
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import List, Dict, Any
import requests
from tqdm import tqdm

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Overpass API endpoint
OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tag to app type mapping
OSM_TAG_MAPPING = {
    'ramp': 'Ramp',
    'elevator': 'Elevator',
    'tactile_paving': 'Tactile Path',
    'entrance': 'Entrance',
    'kerb': 'Ramp',  # Kerb cuts are similar to ramps
    'wheelchair': 'Ramp',  # Wheelchair accessible often means ramp
}


def build_overpass_query(lat: float, lon: float, radius: int) -> str:
    """
    Build Overpass QL query for accessibility features
    
    Args:
        lat: Center latitude
        lon: Center longitude
        radius: Search radius in meters
    
    Returns:
        Overpass QL query string
    """
    query = f"""
    [out:json][timeout:60];
    (
      // Ramps
      node["ramp"="yes"](around:{radius},{lat},{lon});
      way["ramp"="yes"](around:{radius},{lat},{lon});
      node["ramp:wheelchair"="yes"](around:{radius},{lat},{lon});
      
      // Elevators
      node["highway"="elevator"](around:{radius},{lat},{lon});
      way["highway"="elevator"](around:{radius},{lat},{lon});
      node["elevator"="yes"](around:{radius},{lat},{lon});
      
      // Tactile paving
      node["tactile_paving"="yes"](around:{radius},{lat},{lon});
      way["tactile_paving"="yes"](around:{radius},{lat},{lon});
      
      // Wheelchair accessible features
      node["wheelchair"="yes"](around:{radius},{lat},{lon});
      way["wheelchair"="yes"](around:{radius},{lat},{lon});
      
      // Entrances
      node["entrance"](around:{radius},{lat},{lon});
      node["entrance"="yes"](around:{radius},{lat},{lon});
      node["entrance"="main"](around:{radius},{lat},{lon});
      
      // Kerbs (kerb cuts)
      node["kerb"="lowered"](around:{radius},{lat},{lon});
      node["kerb"="flush"](around:{radius},{lat},{lon});
      node["barrier"="kerb"](around:{radius},{lat},{lon});
    );
    out center;
    """.strip()
    
    return query


def map_osm_tags_to_type(tags: Dict[str, str]) -> str:
    """
    Map OSM tags to app tag type
    
    Args:
        tags: Dictionary of OSM tags
    
    Returns:
        App tag type or None
    """
    # Priority order for mapping
    if tags.get('ramp') == 'yes' or tags.get('ramp:wheelchair') == 'yes':
        return 'Ramp'
    
    if tags.get('highway') == 'elevator' or tags.get('elevator') == 'yes':
        return 'Elevator'
    
    if tags.get('tactile_paving') == 'yes':
        return 'Tactile Path'
    
    if 'entrance' in tags:
        return 'Entrance'
    
    if tags.get('kerb') in ['lowered', 'flush'] or tags.get('barrier') == 'kerb':
        return 'Ramp'
    
    if tags.get('wheelchair') == 'yes':
        return 'Ramp'
    
    return None


def fetch_osm_features(
    lat: float,
    lon: float,
    radius: int,
    retry_count: int = 3
) -> List[Dict[str, Any]]:
    """
    Fetch accessibility features from Overpass API
    
    Args:
        lat: Center latitude
        lon: Center longitude
        radius: Search radius in meters
        retry_count: Number of retries on failure
    
    Returns:
        List of OSM elements
    """
    query = build_overpass_query(lat, lon, radius)
    
    for attempt in range(retry_count):
        try:
            logger.info(f"Querying Overpass API (attempt {attempt + 1}/{retry_count})...")
            
            response = requests.post(
                OVERPASS_URL,
                data=query,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=90
            )
            
            if response.status_code == 429:
                wait_time = 60
                logger.warning(f"Rate limited. Waiting {wait_time} seconds...")
                time.sleep(wait_time)
                continue
            
            response.raise_for_status()
            data = response.json()
            
            elements = data.get('elements', [])
            logger.info(f"Received {len(elements)} elements from Overpass API")
            
            return elements
        
        except requests.exceptions.Timeout:
            logger.warning(f"Request timed out (attempt {attempt + 1}/{retry_count})")
            if attempt < retry_count - 1:
                time.sleep(5)
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed: {e}")
            if attempt < retry_count - 1:
                time.sleep(5)
        
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            if attempt < retry_count - 1:
                time.sleep(5)
    
    logger.error("Failed to fetch OSM data after all retries")
    return []


def fetch_address_nominatim(lat: float, lon: float) -> str:
    """
    Fetch address from Nominatim reverse geocoding
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "addressdetails": 1
        }
        headers = {"User-Agent": "AccessAtlas/1.0"}
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            address = data.get('display_name', '')
            if address:
                # Shorten the address
                parts = address.split(', ')
                if len(parts) > 3:
                    return ', '.join(parts[:3])
                return address
        
        time.sleep(1)  # Rate limiting
        return None
    
    except Exception as e:
        logger.warning(f"Failed to fetch address for ({lat}, {lon}): {e}")
        return None


def process_osm_elements(elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Process OSM elements into app tag format
    
    Args:
        elements: Raw OSM elements from Overpass API
    
    Returns:
        List of formatted tag objects
    """
    tags = []
    skipped = 0
    
    for element in tqdm(elements, desc="Processing OSM elements"):
        try:
            # Get coordinates
            if element['type'] == 'node':
                lat = element.get('lat')
                lon = element.get('lon')
            elif element['type'] == 'way' and 'center' in element:
                lat = element['center'].get('lat')
                lon = element['center'].get('lon')
            else:
                skipped += 1
                continue
            
            if lat is None or lon is None:
                skipped += 1
                continue
            
            # Map OSM tags to app type
            osm_tags = element.get('tags', {})
            tag_type = map_osm_tags_to_type(osm_tags)
            
            if tag_type is None:
                skipped += 1
                continue
            
            # Get address/name if available
            name = osm_tags.get('name', '')
            addr_street = osm_tags.get('addr:street', '')
            addr_housenumber = osm_tags.get('addr:housenumber', '')
            
            address_parts = []
            if addr_housenumber:
                address_parts.append(addr_housenumber)
            if addr_street:
                address_parts.append(addr_street)
            if name and not address_parts:
                address_parts.append(name)
            
            address = ' '.join(address_parts) if address_parts else None
            
            # If no address in OSM tags, fetch from Nominatim
            if not address:
                address = fetch_address_nominatim(lat, lon)
            
            # Create tag object
            tag = {
                "id": f"osm-{element['id']}",
                "type": tag_type,
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "source": "osm",
                "osmId": element['id'],
                "timestamp": None,  # Will be set by frontend
                "readonly": True
            }
            
            if address:
                tag["address"] = address
            
            tags.append(tag)
        
        except Exception as e:
            logger.warning(f"Failed to process element {element.get('id', 'unknown')}: {e}")
            skipped += 1
    
    if skipped > 0:
        logger.info(f"Skipped {skipped} elements (no coordinates or unmapped types)")
    
    return tags


def fetch_multiple_locations(
    locations: List[tuple],
    radius: int
) -> List[Dict[str, Any]]:
    """
    Fetch OSM tags from multiple locations
    
    Args:
        locations: List of (lat, lon) tuples
        radius: Search radius in meters for each location
    
    Returns:
        Combined list of all tags
    """
    all_tags = []
    seen_ids = set()
    
    for i, (lat, lon) in enumerate(locations, 1):
        logger.info(f"Fetching location {i}/{len(locations)}: ({lat}, {lon})")
        
        elements = fetch_osm_features(lat, lon, radius)
        tags = process_osm_elements(elements)
        
        # Deduplicate by OSM ID
        new_tags = []
        for tag in tags:
            if tag['id'] not in seen_ids:
                seen_ids.add(tag['id'])
                new_tags.append(tag)
        
        logger.info(f"Added {len(new_tags)} new unique tags from this location")
        all_tags.extend(new_tags)
        
        # Rate limiting between requests
        if i < len(locations):
            logger.info("Waiting 5 seconds before next request...")
            time.sleep(5)
    
    return all_tags


def save_tags(tags: List[Dict[str, Any]], output_path: Path):
    """Save tags to JSON file with statistics"""
    # Count by type
    type_counts = {}
    for tag in tags:
        tag_type = tag['type']
        type_counts[tag_type] = type_counts.get(tag_type, 0) + 1
    
    logger.info(f"Total tags: {len(tags)}")
    logger.info("Tags by type:")
    for tag_type, count in sorted(type_counts.items()):
        logger.info(f"  {tag_type}: {count}")
    
    # Save to file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(tags, f, indent=2)
    
    logger.info(f"Saved {len(tags)} tags to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description="Fetch accessibility features from OpenStreetMap"
    )
    parser.add_argument(
        '--lat',
        type=float,
        default=34.67,
        help='Center latitude'
    )
    parser.add_argument(
        '--lon',
        type=float,
        default=-82.48,
        help='Center longitude'
    )
    parser.add_argument(
        '--radius',
        type=int,
        default=5000,
        help='Search radius in meters (default: 5000m = 5km)'
    )
    parser.add_argument(
        '--output',
        type=str,
        default='../data/osm_tags.json',
        help='Output JSON file path'
    )
    parser.add_argument(
        '--multiple-locations',
        action='store_true',
        help='Fetch from multiple locations around the center point'
    )
    parser.add_argument(
        '--grid-size',
        type=int,
        default=3,
        help='Grid size for multiple locations (e.g., 3 = 3x3 grid)'
    )
    
    args = parser.parse_args()
    
    output_path = Path(args.output)
    
    try:
        if args.multiple_locations:
            # Create a grid of locations
            logger.info(f"Fetching from {args.grid_size}x{args.grid_size} grid of locations")
            
            # Calculate offset in degrees (roughly 1 degree = 111km)
            offset_km = (args.radius / 1000) * 1.5  # 1.5x radius for overlap
            offset_deg = offset_km / 111
            
            locations = []
            center = args.grid_size // 2
            for i in range(args.grid_size):
                for j in range(args.grid_size):
                    lat_offset = (i - center) * offset_deg
                    lon_offset = (j - center) * offset_deg
                    locations.append((
                        args.lat + lat_offset,
                        args.lon + lon_offset
                    ))
            
            logger.info(f"Created {len(locations)} query locations")
            tags = fetch_multiple_locations(locations, args.radius)
        
        else:
            # Single location
            elements = fetch_osm_features(args.lat, args.lon, args.radius)
            
            if not elements:
                logger.warning("No elements returned from Overpass API")
                sys.exit(1)
            
            tags = process_osm_elements(elements)
        
        if not tags:
            logger.warning("No tags were generated")
            sys.exit(1)
        
        # Save results
        save_tags(tags, output_path)
        
        logger.info("✅ OSM fetch completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ OSM fetch failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
