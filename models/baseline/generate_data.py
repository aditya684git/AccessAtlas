"""
Utility script to generate synthetic training data for testing the pipeline.
"""

import os
import csv
import random
from PIL import Image, ImageDraw, ImageFont
import numpy as np


def generate_synthetic_image(tag_type, image_id, output_dir):
    """
    Generate a simple synthetic image with text label.
    Useful for testing the pipeline without real data.
    """
    # Create image
    img = Image.new('RGB', (224, 224), color=(random.randint(100, 255), 
                                              random.randint(100, 255), 
                                              random.randint(100, 255)))
    
    draw = ImageDraw.Draw(img)
    
    # Draw some shapes based on tag type
    if tag_type == 'ramp':
        # Draw triangle
        draw.polygon([(50, 150), (174, 150), (112, 50)], fill=(200, 50, 50))
    elif tag_type == 'elevator':
        # Draw rectangle
        draw.rectangle([70, 70, 154, 154], fill=(50, 200, 50))
    elif tag_type == 'tactile_path':
        # Draw dots
        for i in range(5):
            for j in range(5):
                x = 40 + i * 30
                y = 40 + j * 30
                draw.ellipse([x-5, y-5, x+5, y+5], fill=(50, 50, 200))
    elif tag_type == 'entrance':
        # Draw arch
        draw.rectangle([80, 80, 144, 170], fill=(200, 200, 50))
        draw.ellipse([80, 80, 144, 120], fill=(200, 200, 50))
    elif tag_type == 'obstacle':
        # Draw X
        draw.line([(50, 50), (174, 174)], fill=(200, 0, 0), width=10)
        draw.line([(174, 50), (50, 174)], fill=(200, 0, 0), width=10)
    
    # Add text label (optional, for visual debugging)
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()
    
    text = f"{tag_type}\n#{image_id}"
    draw.text((10, 180), text, fill=(255, 255, 255), font=font)
    
    # Save
    filename = f"synthetic_{tag_type}_{image_id:04d}.jpg"
    filepath = os.path.join(output_dir, filename)
    img.save(filepath)
    
    return filename


def generate_dataset(num_samples=500, output_csv='../../data/tags.csv', 
                     output_images='../../data/images'):
    """
    Generate a synthetic dataset with images and CSV.
    """
    tag_types = ['ramp', 'elevator', 'tactile_path', 'entrance', 'obstacle']
    source_types = ['user', 'osm', 'model']
    
    # Create output directory
    os.makedirs(output_images, exist_ok=True)
    
    # Base coordinates (Pendleton, SC)
    base_lat = 34.67
    base_lon = -82.48
    
    samples = []
    
    print(f"Generating {num_samples} synthetic samples...")
    
    for i in range(num_samples):
        # Random tag type and source
        tag_type = random.choice(tag_types)
        source = random.choice(source_types)
        
        # Random location within ~1 mile radius
        lat = base_lat + random.uniform(-0.01, 0.01)
        lon = base_lon + random.uniform(-0.01, 0.01)
        
        # Generate image
        image_filename = generate_synthetic_image(tag_type, i, output_images)
        
        # Add to samples
        samples.append({
            'image_path': image_filename,  # Just the filename, not images/ prefix
            'lat': round(lat, 6),
            'lon': round(lon, 6),
            'type': tag_type,
            'source': source
        })
        
        if (i + 1) % 100 == 0:
            print(f"  Generated {i + 1}/{num_samples} samples")
    
    # Write CSV
    csv_dir = os.path.dirname(output_csv)
    os.makedirs(csv_dir, exist_ok=True)
    
    with open(output_csv, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['image_path', 'lat', 'lon', 'type', 'source'])
        writer.writeheader()
        writer.writerows(samples)
    
    print(f"\n✅ Dataset generated!")
    print(f"  CSV: {output_csv}")
    print(f"  Images: {output_images}")
    print(f"  Total samples: {num_samples}")
    
    # Print distribution
    print(f"\nTag type distribution:")
    for tag_type in tag_types:
        count = sum(1 for s in samples if s['type'] == tag_type)
        print(f"  {tag_type}: {count}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate synthetic dataset for testing')
    parser.add_argument('--num_samples', type=int, default=500, 
                       help='Number of samples to generate')
    parser.add_argument('--output_csv', type=str, default='../../data/tags.csv',
                       help='Output CSV path')
    parser.add_argument('--output_images', type=str, default='../../data/images',
                       help='Output images directory')
    
    args = parser.parse_args()
    
    generate_dataset(args.num_samples, args.output_csv, args.output_images)
