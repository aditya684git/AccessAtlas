/**
 * TagDebugPanel - UI component for debugging tag visibility
 */

import React, { useState, useEffect } from 'react';
import type { Tag } from '../../types/tag';
import {
  analyzeTagStats,
  generateFilterReport,
  getSourceColor,
  getSourceIcon,
  runDebugCheck,
  type TagStats,
  type FilterReport,
} from '../../lib/tagDebugger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Switch } from './switch';
import { Label } from './label';
import { Separator } from './separator';

interface TagDebugPanelProps {
  allTags: Tag[];
  visibleTags: Tag[];
  filters?: {
    minConfidence?: number;
    allowedSources?: ('user' | 'osm' | 'model')[];
    allowedTypes?: string[];
    viewport?: { north: number; south: number; east: number; west: number };
  };
  onFilterChange?: (filters: {
    showUser: boolean;
    showOSM: boolean;
    showModel: boolean;
    minConfidence: number;
  }) => void;
}

export function TagDebugPanel({
  allTags,
  visibleTags,
  filters,
  onFilterChange,
}: TagDebugPanelProps) {
  const [stats, setStats] = useState<TagStats | null>(null);
  const [report, setReport] = useState<FilterReport | null>(null);
  const [showUser, setShowUser] = useState(true);
  const [showOSM, setShowOSM] = useState(true);
  const [showModel, setShowModel] = useState(true);
  const [minConfidence, setMinConfidence] = useState(50);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setStats(analyzeTagStats(allTags));
    setReport(generateFilterReport(allTags, visibleTags, filters));
  }, [allTags, visibleTags, filters]);

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        showUser,
        showOSM,
        showModel,
        minConfidence: minConfidence / 100,
      });
    }
  }, [showUser, showOSM, showModel, minConfidence, onFilterChange]);

  const handleRunDebug = () => {
    runDebugCheck(allTags, visibleTags, filters);
  };

  if (!stats || !report) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-auto z-[10000] shadow-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">🐛 Tag Debugger</CardTitle>
            <CardDescription>
              {stats.total} total • {visibleTags.length} visible
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '▲' : '▼'}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Source Statistics */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">By Source</h3>
            <div className="space-y-2">
              <SourceStat
                label="User"
                icon="👤"
                count={stats.bySource.user}
                total={stats.total}
                color="#22c55e"
              />
              <SourceStat
                label="OSM"
                icon="🗺️"
                count={stats.bySource.osm}
                total={stats.total}
                color="#3b82f6"
              />
              <SourceStat
                label="Model"
                icon="🤖"
                count={stats.bySource.model}
                total={stats.total}
                color="#eab308"
              />
            </div>
          </div>

          <Separator />

          {/* Visibility Toggles */}
          <div>
            <h3 className="font-semibold mb-3 text-sm">Visibility Filters</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-user" className="flex items-center gap-2">
                  <span style={{ color: '#22c55e' }}>👤</span>
                  Show User Tags
                </Label>
                <Switch
                  id="show-user"
                  checked={showUser}
                  onCheckedChange={setShowUser}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-osm" className="flex items-center gap-2">
                  <span style={{ color: '#3b82f6' }}>🗺️</span>
                  Show OSM Tags
                </Label>
                <Switch
                  id="show-osm"
                  checked={showOSM}
                  onCheckedChange={setShowOSM}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-model" className="flex items-center gap-2">
                  <span style={{ color: '#eab308' }}>🤖</span>
                  Show Model Tags
                </Label>
                <Switch
                  id="show-model"
                  checked={showModel}
                  onCheckedChange={setShowModel}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidence" className="text-sm">
                  Min Confidence: {minConfidence}%
                </Label>
                <input
                  id="confidence"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Filter Report */}
          <div>
            <h3 className="font-semibold mb-2 text-sm">Filtered Tags</h3>
            <div className="space-y-2 text-sm">
              {report.reasons.lowConfidence.length > 0 && (
                <FilterReasonBadge
                  label="Low Confidence"
                  count={report.reasons.lowConfidence.length}
                  variant="warning"
                />
              )}
              {report.reasons.sourceFiltered.length > 0 && (
                <FilterReasonBadge
                  label="Source Filtered"
                  count={report.reasons.sourceFiltered.length}
                  variant="secondary"
                />
              )}
              {report.reasons.typeFiltered.length > 0 && (
                <FilterReasonBadge
                  label="Type Filtered"
                  count={report.reasons.typeFiltered.length}
                  variant="secondary"
                />
              )}
              {report.reasons.outsideViewport.length > 0 && (
                <FilterReasonBadge
                  label="Outside Viewport"
                  count={report.reasons.outsideViewport.length}
                  variant="outline"
                />
              )}
              {report.reasons.missingRequired.length > 0 && (
                <FilterReasonBadge
                  label="Missing Fields"
                  count={report.reasons.missingRequired.length}
                  variant="destructive"
                />
              )}
              {report.filteredOut === 0 && (
                <p className="text-muted-foreground text-xs">No tags filtered</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Warnings */}
          {stats.total === 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-800 text-sm font-semibold">⚠️ No tags found!</p>
              <p className="text-red-600 text-xs mt-1">
                Check storage or backend API
              </p>
            </div>
          )}

          {stats.bySource.model === 0 && stats.total > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-yellow-800 text-sm font-semibold">
                ⚠️ No model tags
              </p>
              <p className="text-yellow-600 text-xs mt-1">
                Model predictions not being saved
              </p>
            </div>
          )}

          {stats.bySource.osm === 0 && stats.total > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-blue-800 text-sm font-semibold">⚠️ No OSM tags</p>
              <p className="text-blue-600 text-xs mt-1">
                OSM features not being fetched
              </p>
            </div>
          )}

          {visibleTags.length === 0 && stats.total > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <p className="text-orange-800 text-sm font-semibold">
                ⚠️ No visible tags
              </p>
              <p className="text-orange-600 text-xs mt-1">
                All tags are filtered out
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleRunDebug}
              variant="outline"
              size="sm"
              className="w-full"
            >
              🔍 Run Full Debug (Console)
            </Button>
            <Button
              onClick={() => {
                setShowUser(true);
                setShowOSM(true);
                setShowModel(true);
                setMinConfidence(0);
              }}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              Show All Tags
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

interface SourceStatProps {
  label: string;
  icon: string;
  count: number;
  total: number;
  color: string;
}

function SourceStat({ label, icon, count, total, color }: SourceStatProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span style={{ color }}>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{count}</Badge>
        <span className="text-xs text-muted-foreground w-12 text-right">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

interface FilterReasonBadgeProps {
  label: string;
  count: number;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning';
}

function FilterReasonBadge({ label, count, variant = 'default' }: FilterReasonBadgeProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <Badge variant={variant as any} className="text-xs">
        {count}
      </Badge>
    </div>
  );
}
