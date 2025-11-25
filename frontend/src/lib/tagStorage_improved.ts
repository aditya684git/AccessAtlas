/**
 * Tag Storage Service with Deployment-Safe Persistence
 * 
 * Storage hierarchy:
 * 1. LocalStorage (browser-based, per-device)
 * 2. Cloud DB integration (optional - Firebase/Supabase)
 * 3. Backend API persistence (future enhancement)
 */

import { isLocalStorageAvailable } from './utils';
import type { Tag } from '../types/tag';
import { STORAGE_KEY as DEFAULT_KEY } from '../types/tag';
import { 
  validateTag, 
  deduplicateTags as deduplicateTagsUtil, 
  type TagValidationResult 
} from './tagValidation';

export interface SaveTagResult {
  success: boolean;
  validation: TagValidationResult;
  savedTag?: Tag;
}

export interface TagStorageService {
  saveTag(tag: Tag, options?: { skipValidation?: boolean; allowDuplicates?: boolean }): Promise<SaveTagResult>;
  getTags(): Promise<Tag[]>;
  updateTag?(id: string, updates: Partial<Tag>): Promise<void>;
  deleteTag?(id: string): Promise<void>;
  clearTags?(): Promise<void>;
  deduplicateTags?(thresholdMeters?: number): Promise<number>;
}

// ============================================================================
// LocalStorage Implementation (Primary)
// ============================================================================

export class LocalTagStorage implements TagStorageService {
  private key: string;

  constructor(key: string = DEFAULT_KEY) {
    this.key = key;
  }

  async saveTag(
    tag: Tag, 
    options: { skipValidation?: boolean; allowDuplicates?: boolean } = {}
  ): Promise<SaveTagResult> {
    if (!isLocalStorageAvailable()) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: ['localStorage not available - data will not persist across sessions'],
          warnings: ['Consider enabling cookies or using cloud storage'],
        },
      };
    }

    try {
      const existingTags = await this.getTags();

      // Validate tag unless skipped
      const validation = options.skipValidation
        ? { valid: true, errors: [], warnings: [] }
        : validateTag(tag, existingTags, {
            allowedTypes: ['Ramp', 'Elevator', 'Tactile Path', 'Entrance', 'Obstacle'],
            spatialThreshold: 2, // 2 meters
            checkDuplicates: !options.allowDuplicates,
          });

      if (!validation.valid) {
        return { success: false, validation };
      }

      if (validation.duplicates && validation.duplicates.length > 0 && !options.allowDuplicates) {
        return { success: false, validation };
      }

      // Save tag
      existingTags.push(tag);
      localStorage.setItem(this.key, JSON.stringify(existingTags));

      console.log(`[LocalTagStorage] ✅ Tag saved: ${tag.type} at (${tag.lat.toFixed(6)}, ${tag.lon.toFixed(6)})`);

      return {
        success: true,
        validation,
        savedTag: tag,
      };
    } catch (err) {
      console.error('[LocalTagStorage] Save error:', err);
      return {
        success: false,
        validation: {
          valid: false,
          errors: [err instanceof Error ? err.message : 'Unknown error'],
          warnings: [],
        },
      };
    }
  }

  async getTags(): Promise<Tag[]> {
    if (!isLocalStorageAvailable()) {
      console.warn('[LocalTagStorage] localStorage not available');
      return [];
    }

    try {
      const raw = localStorage.getItem(this.key);
      const tags = raw ? (JSON.parse(raw) as Tag[]) : [];
      console.log(`[LocalTagStorage] Retrieved ${tags.length} tags`);
      return tags;
    } catch (err) {
      console.error('[LocalTagStorage] Read error:', err);
      return [];
    }
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage not available');
    }

    try {
      const tags = await this.getTags();
      const index = tags.findIndex(t => t.id === id);
      
      if (index === -1) {
        throw new Error(`Tag not found: ${id}`);
      }

      tags[index] = { ...tags[index], ...updates };
      localStorage.setItem(this.key, JSON.stringify(tags));
      
      console.log(`[LocalTagStorage] ✅ Tag updated: ${id}`);
    } catch (err) {
      console.error('[LocalTagStorage] Update error:', err);
      throw err;
    }
  }

  async deleteTag(id: string): Promise<void> {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage not available');
    }

    try {
      const tags = await this.getTags();
      const filtered = tags.filter(t => t.id !== id);
      
      if (filtered.length === tags.length) {
        throw new Error(`Tag not found: ${id}`);
      }

      localStorage.setItem(this.key, JSON.stringify(filtered));
      console.log(`[LocalTagStorage] ✅ Tag deleted: ${id}`);
    } catch (err) {
      console.error('[LocalTagStorage] Delete error:', err);
      throw err;
    }
  }

  async clearTags(): Promise<void> {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage not available');
    }

    try {
      localStorage.removeItem(this.key);
      console.log('[LocalTagStorage] ✅ All tags cleared');
    } catch (err) {
      console.error('[LocalTagStorage] Clear error:', err);
      throw err;
    }
  }

  async deduplicateTags(thresholdMeters: number = 2): Promise<number> {
    if (!isLocalStorageAvailable()) {
      throw new Error('localStorage not available');
    }

    try {
      const tags = await this.getTags();
      const deduplicated = deduplicateTagsUtil(tags, thresholdMeters);
      const removed = tags.length - deduplicated.length;
      
      localStorage.setItem(this.key, JSON.stringify(deduplicated));
      console.log(`[LocalTagStorage] ✅ Removed ${removed} duplicate tags`);
      
      return removed;
    } catch (err) {
      console.error('[LocalTagStorage] Deduplicate error:', err);
      throw err;
    }
  }
}

// ============================================================================
// Cloud Storage Implementation (Optional - for cross-device sync)
// ============================================================================

/**
 * Firebase/Supabase integration template
 * 
 * Uncomment and configure for cloud persistence:
 * 
 * import { initializeApp } from 'firebase/app';
 * import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
 * 
 * export class CloudTagStorage implements TagStorageService {
 *   private db: any;
 *   
 *   constructor() {
 *     const app = initializeApp({
 *       apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
 *       projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
 *     });
 *     this.db = getFirestore(app);
 *   }
 *   
 *   async saveTag(tag: Tag): Promise<SaveTagResult> {
 *     try {
 *       const docRef = await addDoc(collection(this.db, 'tags'), tag);
 *       return { success: true, validation: { valid: true, errors: [], warnings: [] } };
 *     } catch (err) {
 *       return { success: false, validation: { valid: false, errors: [err.message], warnings: [] } };
 *     }
 *   }
 *   
 *   async getTags(): Promise<Tag[]> {
 *     const snapshot = await getDocs(collection(this.db, 'tags'));
 *     return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tag));
 *   }
 * }
 */

// ============================================================================
// Hybrid Storage (LocalStorage + Cloud Backup)
// ============================================================================

export class HybridTagStorage implements TagStorageService {
  private local: LocalTagStorage;
  // private cloud?: CloudTagStorage; // Uncomment for cloud backup

  constructor(key: string = DEFAULT_KEY) {
    this.local = new LocalTagStorage(key);
  }

  async saveTag(tag: Tag, options?: { skipValidation?: boolean; allowDuplicates?: boolean }): Promise<SaveTagResult> {
    // Save to local storage first (fast, always available)
    const result = await this.local.saveTag(tag, options);

    // Optionally sync to cloud (slower, requires network)
    // if (result.success && this.cloud) {
    //   this.cloud.saveTag(tag).catch(err => {
    //     console.warn('[HybridStorage] Cloud backup failed:', err);
    //   });
    // }

    return result;
  }

  async getTags(): Promise<Tag[]> {
    // Try local first (instant)
    const localTags = await this.local.getTags();

    // Optionally merge with cloud (future enhancement)
    // if (this.cloud) {
    //   const cloudTags = await this.cloud.getTags();
    //   return this.mergeTags(localTags, cloudTags);
    // }

    return localTags;
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    return this.local.updateTag!(id, updates);
  }

  async deleteTag(id: string): Promise<void> {
    return this.local.deleteTag!(id);
  }

  async clearTags(): Promise<void> {
    return this.local.clearTags!();
  }

  async deduplicateTags(thresholdMeters?: number): Promise<number> {
    return this.local.deduplicateTags!(thresholdMeters);
  }
}

// ============================================================================
// Export default storage instance
// ============================================================================

export const tagStorage = new LocalTagStorage();

// For cloud integration, use:
// export const tagStorage = new HybridTagStorage();
