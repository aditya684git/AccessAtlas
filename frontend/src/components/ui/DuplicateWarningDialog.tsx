/**
 * DuplicateWarningDialog - Shows warning when duplicate tags are detected
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import type { Tag } from '../../types/tag';

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duplicates: Tag[];
  onConfirm: () => void;
  onCancel: () => void;
  tagType: string;
}

const TAG_ICONS: Record<string, string> = {
  'Ramp': '♿',
  'Elevator': '🛗',
  'Tactile Path': '🦯',
  'Entrance': '🚪',
  'Obstacle': '🚧',
};

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  duplicates,
  onConfirm,
  onCancel,
  tagType,
}: DuplicateWarningDialogProps) {
  const emoji = TAG_ICONS[tagType] || '📍';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            Possible Duplicate Tag
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-3">
              <p>
                Found {duplicates.length} existing {tagType} tag{duplicates.length > 1 ? 's' : ''}{' '}
                within 2 meters of this location:
              </p>
              
              <div className="bg-muted rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                {duplicates.map((tag, idx) => (
                  <div key={tag.id} className="text-sm">
                    <div className="font-medium">
                      {idx + 1}. {tag.type} {tag.source === 'osm' ? '(from OpenStreetMap)' : '(user-added)'}
                    </div>
                    {tag.address && (
                      <div className="text-muted-foreground text-xs mt-1">
                        {tag.address}
                      </div>
                    )}
                    <div className="text-muted-foreground text-xs">
                      Coordinates: {tag.lat.toFixed(6)}, {tag.lon.toFixed(6)}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm">
                Adding this tag may create a duplicate. Would you like to add it anyway?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Add Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
