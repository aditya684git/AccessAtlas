/**
 * Tag Debugger Utility
 * 
 * Provides comprehensive debugging tools for tag visibility and filtering issues.
 */

import type { Tag } from '../types/tag';

export interface TagStats {
  total: number;
  bySource: {
    user: number;
    osm: number;
    model: number;
  };
  withConfidence: number;
  withAddress: number;
  missingFields: Tag[];
}

export interface FilterReport {
  totalTags: number;
  visibleTags: number;
  filteredOut: number;
  reasons: {
    lowConfidence: Tag[];
    sourceFiltered: Tag[];
    outsideViewport: Tag[];
    typeFiltered: Tag[];
    missingRequired: Tag[];
  };
}

/**
 * Analyze tag collection and return statistics
 */
export function analyzeTagStats(tags: Tag[]): TagStats {
  const stats: TagStats = {
    total: tags.length,
    bySource: {
      user: 0,
      osm: 0,
      model: 0,
    },
    withConfidence: 0,
    withAddress: 0,
    missingFields: [],
  };

  tags.forEach(tag => {
    // Count by source
    if (tag.source === 'user') stats.bySource.user++;
    else if (tag.source === 'osm') stats.bySource.osm++;
    else if (tag.source === 'model') stats.bySource.model++;

    // Count optional fields
    if (tag.confidence !== undefined) stats.withConfidence++;
    if (tag.address) stats.withAddress++;

    // Check for missing required fields
    if (!tag.id || !tag.type || tag.lat === undefined || tag.lon === undefined || !tag.source) {
      stats.missingFields.push(tag);
    }
  });

  return stats;
}

/**
 * Log detailed tag statistics to console
 */
export function logTagStats(tags: Tag[]): void {
  const stats = analyzeTagStats(tags);

  console.group('🔍 Tag Statistics');
  console.log(`Total Tags: ${stats.total}`);
  console.log('');
  
  console.group('📊 By Source:');
  console.log(`👤 User: ${stats.bySource.user} (${((stats.bySource.user / stats.total) * 100 || 0).toFixed(1)}%)`);
  console.log(`🗺️  OSM: ${stats.bySource.osm} (${((stats.bySource.osm / stats.total) * 100 || 0).toFixed(1)}%)`);
  console.log(`🤖 Model: ${stats.bySource.model} (${((stats.bySource.model / stats.total) * 100 || 0).toFixed(1)}%)`);
  console.groupEnd();
  
  console.log('');
  console.log(`Tags with confidence: ${stats.withConfidence}`);
  console.log(`Tags with address: ${stats.withAddress}`);
  
  if (stats.missingFields.length > 0) {
    console.warn(`⚠️ ${stats.missingFields.length} tags missing required fields:`);
    console.table(stats.missingFields);
  }
  
  console.groupEnd();
}

/**
 * Check if tag passes confidence threshold
 */
export function passesConfidenceThreshold(tag: Tag, minConfidence: number = 0.5): boolean {
  // If no confidence field, assume it passes (user/osm tags)
  if (tag.confidence === undefined) return true;
  return tag.confidence >= minConfidence;
}

/**
 * Check if tag is within viewport bounds
 */
export function isInViewport(
  tag: Tag,
  bounds: { north: number; south: number; east: number; west: number }
): boolean {
  return (
    tag.lat >= bounds.south &&
    tag.lat <= bounds.north &&
    tag.lon >= bounds.west &&
    tag.lon <= bounds.east
  );
}

/**
 * Generate comprehensive filter report
 */
export function generateFilterReport(
  allTags: Tag[],
  visibleTags: Tag[],
  filters: {
    minConfidence?: number;
    allowedSources?: ('user' | 'osm' | 'model')[];
    allowedTypes?: string[];
    viewport?: { north: number; south: number; east: number; west: number };
  } = {}
): FilterReport {
  const visibleIds = new Set(visibleTags.map(t => t.id));
  const filteredTags = allTags.filter(t => !visibleIds.has(t.id));

  const report: FilterReport = {
    totalTags: allTags.length,
    visibleTags: visibleTags.length,
    filteredOut: filteredTags.length,
    reasons: {
      lowConfidence: [],
      sourceFiltered: [],
      outsideViewport: [],
      typeFiltered: [],
      missingRequired: [],
    },
  };

  filteredTags.forEach(tag => {
    // Check missing required fields
    if (!tag.id || !tag.type || tag.lat === undefined || tag.lon === undefined || !tag.source) {
      report.reasons.missingRequired.push(tag);
      return;
    }

    // Check confidence threshold
    if (filters.minConfidence !== undefined && !passesConfidenceThreshold(tag, filters.minConfidence)) {
      report.reasons.lowConfidence.push(tag);
    }

    // Check source filter
    if (filters.allowedSources && !filters.allowedSources.includes(tag.source)) {
      report.reasons.sourceFiltered.push(tag);
    }

    // Check type filter
    if (filters.allowedTypes && !filters.allowedTypes.includes(tag.type)) {
      report.reasons.typeFiltered.push(tag);
    }

    // Check viewport
    if (filters.viewport && !isInViewport(tag, filters.viewport)) {
      report.reasons.outsideViewport.push(tag);
    }
  });

  return report;
}

/**
 * Log filter report to console
 */
export function logFilterReport(report: FilterReport): void {
  console.group('🔍 Filter Report');
  console.log(`Total Tags: ${report.totalTags}`);
  console.log(`✅ Visible: ${report.visibleTags}`);
  console.log(`❌ Filtered Out: ${report.filteredOut}`);
  console.log('');

  if (report.reasons.lowConfidence.length > 0) {
    console.group(`⚠️ Low Confidence (${report.reasons.lowConfidence.length}):`);
    report.reasons.lowConfidence.forEach(tag => {
      console.log(`  ${tag.type} at (${tag.lat.toFixed(4)}, ${tag.lon.toFixed(4)}) - confidence: ${tag.confidence?.toFixed(2) || 'N/A'}`);
    });
    console.groupEnd();
  }

  if (report.reasons.sourceFiltered.length > 0) {
    console.group(`🚫 Source Filtered (${report.reasons.sourceFiltered.length}):`);
    const bySource = { user: 0, osm: 0, model: 0 };
    report.reasons.sourceFiltered.forEach(tag => {
      bySource[tag.source]++;
    });
    console.log(`  User: ${bySource.user}, OSM: ${bySource.osm}, Model: ${bySource.model}`);
    console.groupEnd();
  }

  if (report.reasons.typeFiltered.length > 0) {
    console.group(`🏷️ Type Filtered (${report.reasons.typeFiltered.length}):`);
    const byType: Record<string, number> = {};
    report.reasons.typeFiltered.forEach(tag => {
      byType[tag.type] = (byType[tag.type] || 0) + 1;
    });
    console.log(byType);
    console.groupEnd();
  }

  if (report.reasons.outsideViewport.length > 0) {
    console.log(`📍 Outside Viewport: ${report.reasons.outsideViewport.length}`);
  }

  if (report.reasons.missingRequired.length > 0) {
    console.warn(`⛔ Missing Required Fields (${report.reasons.missingRequired.length}):`);
    console.table(report.reasons.missingRequired);
  }

  console.groupEnd();
}

/**
 * Log individual tag details
 */
export function logTagDetails(tag: Tag, index?: number): void {
  const prefix = index !== undefined ? `Tag #${index + 1}` : 'Tag';
  console.group(`${prefix}: ${tag.type}`);
  console.log(`ID: ${tag.id}`);
  console.log(`Type: ${tag.type}`);
  console.log(`Coordinates: (${tag.lat.toFixed(6)}, ${tag.lon.toFixed(6)})`);
  console.log(`Source: ${tag.source}`);
  if (tag.confidence !== undefined) {
    console.log(`Confidence: ${(tag.confidence * 100).toFixed(1)}%`);
  }
  if (tag.address) {
    console.log(`Address: ${tag.address}`);
  }
  if (tag.osmId) {
    console.log(`OSM ID: ${tag.osmId}`);
  }
  console.log(`Timestamp: ${tag.timestamp}`);
  console.log(`Read-only: ${tag.readonly ? 'Yes' : 'No'}`);
  console.groupEnd();
}

/**
 * Log all tags with details
 */
export function logAllTags(tags: Tag[]): void {
  console.group(`📋 All Tags (${tags.length})`);
  tags.forEach((tag, idx) => logTagDetails(tag, idx));
  console.groupEnd();
}

/**
 * Get color code for tag source
 */
export function getSourceColor(source: 'user' | 'osm' | 'model'): string {
  switch (source) {
    case 'user':
      return '#3b82f6'; // Blue
    case 'osm':
      return '#22c55e'; // Green
    case 'model':
      return '#a855f7'; // Purple
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Get emoji icon for tag source
 */
export function getSourceIcon(source: 'user' | 'osm' | 'model'): string {
  switch (source) {
    case 'user':
      return '👤';
    case 'osm':
      return '🗺️';
    case 'model':
      return '🤖';
    default:
      return '❓';
  }
}

/**
 * Validate tag has all required fields
 */
export function validateTagStructure(tag: any): { valid: boolean; missing: string[] } {
  const required = ['id', 'type', 'lat', 'lon', 'source', 'timestamp'];
  const missing: string[] = [];

  required.forEach(field => {
    if (tag[field] === undefined || tag[field] === null || tag[field] === '') {
      missing.push(field);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Run comprehensive debug check
 */
export function runDebugCheck(
  allTags: Tag[],
  visibleTags: Tag[],
  filters?: {
    minConfidence?: number;
    allowedSources?: ('user' | 'osm' | 'model')[];
    allowedTypes?: string[];
    viewport?: { north: number; south: number; east: number; west: number };
  }
): void {
  console.clear();
  console.log('🐛 ========== TAG DEBUG REPORT ==========');
  console.log('');

  // Overall stats
  logTagStats(allTags);
  console.log('');

  // Filter report
  const report = generateFilterReport(allTags, visibleTags, filters);
  logFilterReport(report);
  console.log('');

  // Warnings
  if (allTags.length === 0) {
    console.warn('⚠️ WARNING: No tags found in the system!');
    console.warn('   - Check if tags are being loaded from storage');
    console.warn('   - Check if backend API is returning data');
    console.warn('   - Check network tab for failed requests');
  }

  if (report.visibleTags === 0 && allTags.length > 0) {
    console.error('❌ ERROR: Tags exist but none are visible!');
    console.error('   - Check filter settings');
    console.error('   - Check viewport constraints');
    console.error('   - Check if markers are being rendered');
  }

  const stats = analyzeTagStats(allTags);
  if (stats.bySource.model === 0) {
    console.warn('⚠️ WARNING: No model-generated tags found!');
    console.warn('   - Check if model predictions are being saved');
    console.warn('   - Check if tags have source="model"');
  }

  if (stats.bySource.osm === 0) {
    console.warn('⚠️ WARNING: No OSM tags found!');
    console.warn('   - Check if OSM features are being fetched');
    console.warn('   - Check if Overpass API is working');
    console.warn('   - Check network tab for OSM requests');
  }

  console.log('');
  console.log('🐛 ========================================');
}
