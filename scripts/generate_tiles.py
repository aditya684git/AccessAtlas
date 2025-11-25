#!/usr/bin/env python3
"""
Map Tile Generator for AccessAtlas Training Pipeline

Generates map tile images from various providers (OpenStreetMap, Mapbox, Google)
for training the accessibility tag classification model.

Usage:
    # Generate single tile
    python generate_tiles.py --lat 34.0522 --lon -118.2437 --zoom 18
    
    # Generate tiles from CSV
    python generate_tiles.py --csv ../data/tags.csv --zoom 18
    
    # Use specific provider
    python generate_tiles.py --csv ../data/tags.csv --provider mapbox --token YOUR_TOKEN

Providers:
    - osm: OpenStreetMap (free, no token required)
    - mapbox: Mapbox Static API (requires access token)
    - google: Google Static Maps API (requires API key)
"""

import argparse
import os
import time
from pathlib import Path
from typing import Optional, Tuple, List
import requests
import pandas as pd
from PIL import Image
from io import BytesIO
from tqdm import tqdm


class TileGenerator:
    """Generate map tiles from various providers."""
    
    PROVIDERS = {
        'osm': {
            'name': 'OpenStreetMap',
            'url': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            'requires_token': False,
            'rate_limit': 1.0,  # seconds between requests
            'user_agent': 'AccessAtlas/1.0 Training Pipeline'
        },
        'mapbox': {
            'name': 'Mapbox Static API',
            'url': 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/{lon},{lat},{zoom}/{size}?access_token={token}',
            'requires_token': True,
            'rate_limit': 0.1,
            'default_size': '512x512'
        },
        'google': {
            'name': 'Google Static Maps API',
            'url': 'https://maps.googleapis.com/maps/api/staticmap?center={lat},{lon}&zoom={zoom}&size={size}&maptype=roadmap&key={token}',
            'requires_token': True,
            'rate_limit': 0.1,
            'default_size': '512x512'
        }
    }
    
    def __init__(
        self,
        provider: str = 'osm',
        token: Optional[str] = None,
        output_dir: str = '../data/images',
        tile_size: int = 512,
        zoom: int = 18
    ):
        """
        Initialize tile generator.
        
        Args:
            provider: Map tile provider ('osm', 'mapbox', 'google')
            token: API token/key for providers that require authentication
            output_dir: Directory to save generated tiles
            tile_size: Size of output tiles in pixels
            zoom: Zoom level (higher = more detail)
        """
        if provider not in self.PROVIDERS:
            raise ValueError(f"Unknown provider: {provider}. Choose from {list(self.PROVIDERS.keys())}")
        
        self.provider = provider
        self.config = self.PROVIDERS[provider]
        self.token = token
        self.output_dir = Path(output_dir)
        self.tile_size = tile_size
        self.zoom = zoom
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate token requirement
        if self.config['requires_token'] and not token:
            raise ValueError(f"{self.config['name']} requires an access token/API key")
        
        # Setup session with headers
        self.session = requests.Session()
        if provider == 'osm':
            self.session.headers.update({'User-Agent': self.config['user_agent']})
    
    def lat_lon_to_tile(self, lat: float, lon: float, zoom: int) -> Tuple[int, int]:
        """
        Convert lat/lon to tile coordinates (for OSM tile servers).
        
        Args:
            lat: Latitude
            lon: Longitude
            zoom: Zoom level
            
        Returns:
            Tuple of (x, y) tile coordinates
        """
        import math
        lat_rad = math.radians(lat)
        n = 2.0 ** zoom
        x = int((lon + 180.0) / 360.0 * n)
        y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
        return x, y
    
    def generate_tile(
        self,
        lat: float,
        lon: float,
        filename: Optional[str] = None,
        retry: int = 3
    ) -> Optional[str]:
        """
        Generate a single map tile.
        
        Args:
            lat: Latitude
            lon: Longitude
            filename: Output filename (default: tile_{lat}_{lon}.png)
            retry: Number of retry attempts
            
        Returns:
            Path to saved image or None if failed
        """
        if filename is None:
            filename = f"tile_{lat:.4f}_{lon:.4f}.png"
        
        output_path = self.output_dir / filename
        
        # Skip if already exists
        if output_path.exists():
            return str(output_path)
        
        # Build URL based on provider
        if self.provider == 'osm':
            x, y = self.lat_lon_to_tile(lat, lon, self.zoom)
            url = self.config['url'].format(z=self.zoom, x=x, y=y)
        elif self.provider == 'mapbox':
            size = self.config['default_size']
            url = self.config['url'].format(
                lon=lon, lat=lat, zoom=self.zoom, size=size, token=self.token
            )
        elif self.provider == 'google':
            size = self.config['default_size']
            url = self.config['url'].format(
                lat=lat, lon=lon, zoom=self.zoom, size=size, token=self.token
            )
        
        # Fetch tile with retry logic
        for attempt in range(retry):
            try:
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                
                # Load and resize image
                img = Image.open(BytesIO(response.content))
                
                # Resize to target size if needed
                if img.size != (self.tile_size, self.tile_size):
                    img = img.resize((self.tile_size, self.tile_size), Image.Resampling.LANCZOS)
                
                # Save image
                img.save(output_path, 'PNG')
                
                # Rate limiting
                time.sleep(self.config['rate_limit'])
                
                return str(output_path)
                
            except Exception as e:
                if attempt == retry - 1:
                    print(f"Failed to generate tile for ({lat}, {lon}): {e}")
                    return None
                time.sleep(2 ** attempt)  # Exponential backoff
        
        return None
    
    def generate_from_csv(
        self,
        csv_path: str,
        lat_col: str = 'lat',
        lon_col: str = 'lon',
        image_path_col: str = 'image_path',
        update_csv: bool = True
    ) -> List[str]:
        """
        Generate tiles for all locations in a CSV file.
        
        Args:
            csv_path: Path to CSV file with lat/lon columns
            lat_col: Name of latitude column
            lon_col: Name of longitude column
            image_path_col: Name of column to store image paths
            update_csv: If True, update CSV with generated image paths
            
        Returns:
            List of generated image paths
        """
        df = pd.read_csv(csv_path)
        
        if lat_col not in df.columns or lon_col not in df.columns:
            raise ValueError(f"CSV must contain '{lat_col}' and '{lon_col}' columns")
        
        generated_paths = []
        
        print(f"Generating {len(df)} tiles from {csv_path}")
        print(f"Provider: {self.config['name']}, Zoom: {self.zoom}, Size: {self.tile_size}px")
        
        for idx, row in tqdm(df.iterrows(), total=len(df), desc="Generating tiles"):
            lat = row[lat_col]
            lon = row[lon_col]
            
            # Use existing filename if available
            if image_path_col in row and pd.notna(row[image_path_col]):
                filename = os.path.basename(row[image_path_col])
            else:
                filename = f"tile_{lat:.4f}_{lon:.4f}.png"
            
            path = self.generate_tile(lat, lon, filename)
            generated_paths.append(path)
            
            # Update dataframe
            if update_csv and path:
                df.at[idx, image_path_col] = os.path.basename(path)
        
        # Save updated CSV
        if update_csv:
            df.to_csv(csv_path, index=False)
            print(f"Updated CSV with image paths: {csv_path}")
        
        successful = sum(1 for p in generated_paths if p is not None)
        print(f"Successfully generated {successful}/{len(generated_paths)} tiles")
        
        return generated_paths


def main():
    parser = argparse.ArgumentParser(
        description='Generate map tiles for AccessAtlas training pipeline',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Input options
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument('--csv', type=str, help='Path to CSV file with lat/lon columns')
    input_group.add_argument('--lat', type=float, help='Latitude for single tile')
    
    parser.add_argument('--lon', type=float, help='Longitude for single tile')
    
    # Provider options
    parser.add_argument(
        '--provider',
        type=str,
        default='osm',
        choices=['osm', 'mapbox', 'google'],
        help='Map tile provider (default: osm)'
    )
    parser.add_argument('--token', type=str, help='API token/key for provider')
    
    # Tile options
    parser.add_argument('--zoom', type=int, default=18, help='Zoom level (default: 18)')
    parser.add_argument('--size', type=int, default=512, help='Tile size in pixels (default: 512)')
    parser.add_argument('--output', type=str, default='../data/images', help='Output directory')
    
    # CSV options
    parser.add_argument('--lat-col', type=str, default='lat', help='Latitude column name')
    parser.add_argument('--lon-col', type=str, default='lon', help='Longitude column name')
    parser.add_argument('--no-update-csv', action='store_true', help='Do not update CSV with image paths')
    
    args = parser.parse_args()
    
    # Validate single tile input
    if args.lat is not None and args.lon is None:
        parser.error('--lon is required when using --lat')
    
    # Initialize generator
    try:
        generator = TileGenerator(
            provider=args.provider,
            token=args.token,
            output_dir=args.output,
            tile_size=args.size,
            zoom=args.zoom
        )
    except ValueError as e:
        parser.error(str(e))
        return
    
    # Generate tiles
    if args.csv:
        generator.generate_from_csv(
            args.csv,
            lat_col=args.lat_col,
            lon_col=args.lon_col,
            update_csv=not args.no_update_csv
        )
    else:
        path = generator.generate_tile(args.lat, args.lon)
        if path:
            print(f"Tile saved to: {path}")
        else:
            print("Failed to generate tile")
            exit(1)


if __name__ == '__main__':
    main()
