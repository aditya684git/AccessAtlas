/**
 * Test Data Generator for Debugging
 * 
 * Use this to add sample model and OSM tags for testing the debug system
 */

import type { Tag } from '../types/tag';
import { v4 as uuidv4 } from 'uuid';
import { reverseGeocode } from './osmApi';

/**
 * Generate sample model-predicted tags around a location with real addresses
 */
export async function generateModelTags(centerLat: number, centerLon: number, count: number = 5): Promise<Tag[]> {
  const types = ['Ramp', 'Elevator', 'Tactile Path', 'Entrance', 'Obstacle'];
  const tags: Tag[] = [];

  for (let i = 0; i < count; i++) {
    // Random offset within ~100 meters
    const latOffset = (Math.random() - 0.5) * 0.001;
    const lonOffset = (Math.random() - 0.5) * 0.001;
    const lat = centerLat + latOffset;
    const lon = centerLon + lonOffset;
    
    // Fetch real address
    let address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    try {
      const addressData = await reverseGeocode(lat, lon);
      if (addressData?.display_name) {
        address = addressData.display_name;
      }
    } catch (e) {
      console.warn('Failed to fetch address for test tag:', e);
    }
    
    tags.push({
      id: uuidv4(),
      type: types[i % types.length],
      lat,
      lon,
      timestamp: new Date().toISOString(),
      source: 'model',
      confidence: 0.5 + Math.random() * 0.5, // Random confidence 50-100%
      address,
    });
  }

  return tags;
}

/**
 * Generate sample OSM tags around a location with real addresses
 */
export async function generateOSMTags(centerLat: number, centerLon: number, count: number = 5): Promise<Tag[]> {
  const types = ['Ramp', 'Elevator', 'Entrance'];
  const tags: Tag[] = [];

  for (let i = 0; i < count; i++) {
    // Random offset within ~100 meters
    const latOffset = (Math.random() - 0.5) * 0.001;
    const lonOffset = (Math.random() - 0.5) * 0.001;
    const lat = centerLat + latOffset;
    const lon = centerLon + lonOffset;
    
    // Fetch real address
    let address = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    try {
      const addressData = await reverseGeocode(lat, lon);
      if (addressData?.display_name) {
        address = addressData.display_name;
      }
    } catch (e) {
      console.warn('Failed to fetch address for test tag:', e);
    }
    
    tags.push({
      id: `osm-test-${i}`,
      type: types[i % types.length],
      lat,
      lon,
      timestamp: new Date().toISOString(),
      source: 'osm',
      osmId: 1000000 + i,
      readonly: true,
      address,
    });
  }

  return tags;
}

/**
 * Add test model and OSM tags to localStorage for debugging
 * 
 * Usage in browser console:
 * import { addTestData } from './lib/testDataGenerator';
 * await addTestData(34.67, -82.48);
 */
export async function addTestData(centerLat: number, centerLon: number): Promise<void> {
  console.log('🔄 Generating test tags with real addresses...');
  
  const modelTags = await generateModelTags(centerLat, centerLon, 5);
  console.log('✅ Generated', modelTags.length, 'model tags');
  
  const osmTags = await generateOSMTags(centerLat, centerLon, 5);
  console.log('✅ Generated', osmTags.length, 'OSM tags');
  
  // Get existing tags
  const existingJson = localStorage.getItem('accessibility_tags');
  const existing = existingJson ? JSON.parse(existingJson) : [];
  
  // Add new tags
  const updated = [...existing, ...modelTags, ...osmTags];
  
  // Save back to storage
  localStorage.setItem('accessibility_tags', JSON.stringify(updated));
  
  console.log('✅ Added test data:');
  console.log(`  - ${modelTags.length} model tags`);
  console.log(`  - ${osmTags.length} OSM tags`);
  console.log('  - Refresh the page to see them!');
}

/**
 * Clear all test tags from localStorage
 */
export function clearTestData(): void {
  const existingJson = localStorage.getItem('accessibility_tags');
  if (!existingJson) {
    console.log('No tags to clear');
    return;
  }
  
  const existing = JSON.parse(existingJson);
  const filtered = existing.filter((tag: Tag) => 
    !tag.address?.includes('Test Model Location') && 
    !tag.address?.includes('Test OSM Location')
  );
  
  localStorage.setItem('accessibility_tags', JSON.stringify(filtered));
  
  console.log(`✅ Removed ${existing.length - filtered.length} test tags`);
  console.log('  - Refresh the page to see changes!');
}

/**
 * Quick function to add test data at current map center
 * Call this from browser console with await window.addTestTags()
 */
if (typeof window !== 'undefined') {
  (window as any).addTestTags = async () => {
    // Default to Clemson coordinates
    await addTestData(34.67, -82.48);
  };
  
  (window as any).clearTestTags = () => {
    clearTestData();
  };
}
