/**
 * Tag Validation and Deduplication Utilities
 * 
 * Provides spatial validation and duplicate detection for accessibility tags.
 */

import type { Tag } from '../types/tag';

/** Default spatial threshold in meters for duplicate detection */
const DEFAULT_SPATIAL_THRESHOLD_METERS = 2;

/** Earth radius in meters (for Haversine formula) */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Check if two tags are duplicates based on type and spatial proximity
 * @param tag1 First tag
 * @param tag2 Second tag
 * @param thresholdMeters Spatial threshold in meters (default: 2m)
 * @returns True if tags are considered duplicates
 */
export function areDuplicateTags(
  tag1: Tag,
  tag2: Tag,
  thresholdMeters: number = DEFAULT_SPATIAL_THRESHOLD_METERS
): boolean {
  // Different types are never duplicates
  if (tag1.type !== tag2.type) {
    return false;
  }

  // Calculate distance
  const distance = calculateDistance(tag1.lat, tag1.lon, tag2.lat, tag2.lon);

  return distance <= thresholdMeters;
}

/**
 * Find duplicate tags in a list
 * @param newTag Tag to check for duplicates
 * @param existingTags List of existing tags
 * @param thresholdMeters Spatial threshold in meters (default: 2m)
 * @returns Array of duplicate tags found
 */
export function findDuplicates(
  newTag: Tag,
  existingTags: Tag[],
  thresholdMeters: number = DEFAULT_SPATIAL_THRESHOLD_METERS
): Tag[] {
  return existingTags.filter((existing) =>
    areDuplicateTags(newTag, existing, thresholdMeters)
  );
}

/**
 * Validation result for a tag
 */
export interface TagValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicates?: Tag[];
}

/**
 * Validate tag coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns True if valid
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Validate tag type
 * @param type Tag type string
 * @param allowedTypes Optional list of allowed types
 * @returns True if valid
 */
export function isValidTagType(type: string, allowedTypes?: string[]): boolean {
  if (!type || typeof type !== 'string') {
    return false;
  }

  if (allowedTypes && allowedTypes.length > 0) {
    return allowedTypes.includes(type);
  }

  return true;
}

/**
 * Comprehensive tag validation
 * @param tag Tag to validate
 * @param existingTags List of existing tags for duplicate checking
 * @param options Validation options
 * @returns Validation result
 */
export function validateTag(
  tag: Partial<Tag>,
  existingTags: Tag[] = [],
  options: {
    allowedTypes?: string[];
    spatialThreshold?: number;
    checkDuplicates?: boolean;
  } = {}
): TagValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const {
    allowedTypes,
    spatialThreshold = DEFAULT_SPATIAL_THRESHOLD_METERS,
    checkDuplicates = true,
  } = options;

  // Validate required fields
  if (!tag.type) {
    errors.push('Tag type is required');
  } else if (!isValidTagType(tag.type, allowedTypes)) {
    if (allowedTypes) {
      errors.push(`Invalid tag type. Allowed types: ${allowedTypes.join(', ')}`);
    } else {
      errors.push('Invalid tag type');
    }
  }

  if (tag.lat === undefined || tag.lon === undefined) {
    errors.push('Coordinates (lat, lon) are required');
  } else if (!isValidCoordinate(tag.lat, tag.lon)) {
    errors.push('Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180');
  }

  if (!tag.id) {
    errors.push('Tag ID is required');
  }

  // Validate source
  if (tag.source && !['user', 'osm', 'model'].includes(tag.source)) {
    warnings.push('Unknown source type. Expected: user, osm, or model');
  }

  // Validate confidence
  if (tag.confidence !== undefined) {
    if (typeof tag.confidence !== 'number' || tag.confidence < 0 || tag.confidence > 1) {
      warnings.push('Confidence should be a number between 0 and 1');
    }
  }

  // Check for duplicates
  let duplicates: Tag[] = [];
  if (checkDuplicates && errors.length === 0 && tag.type && tag.lat && tag.lon) {
    duplicates = findDuplicates(
      tag as Tag,
      existingTags,
      spatialThreshold
    );

    if (duplicates.length > 0) {
      warnings.push(
        `Found ${duplicates.length} potential duplicate tag(s) within ${spatialThreshold}m`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
  };
}

/**
 * Merge duplicate tags by keeping the highest confidence or most recent
 * @param duplicates Array of duplicate tags
 * @returns Merged tag
 */
export function mergeDuplicateTags(duplicates: Tag[]): Tag {
  if (duplicates.length === 0) {
    throw new Error('Cannot merge empty array of tags');
  }

  if (duplicates.length === 1) {
    return duplicates[0];
  }

  // Sort by confidence (descending), then by timestamp (descending)
  const sorted = [...duplicates].sort((a, b) => {
    // Prioritize by confidence if available
    if (a.confidence !== undefined && b.confidence !== undefined) {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
    }

    // Then by timestamp (most recent first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return sorted[0];
}

/**
 * Remove duplicates from a tag array
 * @param tags Array of tags
 * @param thresholdMeters Spatial threshold for duplicate detection
 * @returns Array of unique tags
 */
export function deduplicateTags(
  tags: Tag[],
  thresholdMeters: number = DEFAULT_SPATIAL_THRESHOLD_METERS
): Tag[] {
  const unique: Tag[] = [];
  const processed = new Set<string>();

  for (const tag of tags) {
    if (processed.has(tag.id)) {
      continue;
    }

    // Find all duplicates of this tag
    const duplicates = tags.filter(
      (t) => !processed.has(t.id) && areDuplicateTags(tag, t, thresholdMeters)
    );

    // Merge duplicates
    const merged = mergeDuplicateTags(duplicates);
    unique.push(merged);

    // Mark all duplicates as processed
    duplicates.forEach((d) => processed.add(d.id));
  }

  return unique;
}
