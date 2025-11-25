import { isLocalStorageAvailable } from './utils';
import type { Tag } from '../types/tag';
import { STORAGE_KEY as DEFAULT_KEY } from '../types/tag';
import { validateTag, deduplicateTags as deduplicateTagsUtil, type TagValidationResult } from './tagValidation';

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

/** LocalStorage-backed implementation */
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
          errors: ['localStorage not available'],
          warnings: [],
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

      // Return validation errors if invalid
      if (!validation.valid) {
        return {
          success: false,
          validation,
        };
      }

      // Return warning if duplicates found and not allowed
      if (validation.duplicates && validation.duplicates.length > 0 && !options.allowDuplicates) {
        return {
          success: false,
          validation,
        };
      }

      // Save tag
      existingTags.push(tag);
      localStorage.setItem(this.key, JSON.stringify(existingTags));

      return {
        success: true,
        validation,
        savedTag: tag,
      };
    } catch (err) {
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
    if (!isLocalStorageAvailable()) return Promise.resolve([]);
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as Tag[]) : [];
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    if (!isLocalStorageAvailable()) return Promise.reject(new Error('localStorage not available'));
    try {
      const tags = await this.getTags();
      const index = tags.findIndex((t) => t.id === id);
      if (index === -1) return Promise.reject(new Error('Tag not found'));
      tags[index] = { ...tags[index], ...updates };
      localStorage.setItem(this.key, JSON.stringify(tags));
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async deleteTag(id: string): Promise<void> {
    if (!isLocalStorageAvailable()) return Promise.reject(new Error('localStorage not available'));
    try {
      const tags = await this.getTags();
      const filtered = tags.filter((t) => t.id !== id);
      localStorage.setItem(this.key, JSON.stringify(filtered));
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async clearTags(): Promise<void> {
    if (!isLocalStorageAvailable()) return Promise.resolve();
    try {
      localStorage.removeItem(this.key);
      return Promise.resolve();
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async deduplicateTags(thresholdMeters: number = 2): Promise<number> {
    if (!isLocalStorageAvailable()) return Promise.resolve(0);
    try {
      const tags = await this.getTags();
      const originalCount = tags.length;
      const deduplicated = deduplicateTagsUtil(tags, thresholdMeters);
      localStorage.setItem(this.key, JSON.stringify(deduplicated));
      return Promise.resolve(originalCount - deduplicated.length);
    } catch (err) {
      return Promise.reject(err);
    }
  }
}

/** No-op storage used when localStorage unavailable */
export class NoopTagStorage implements TagStorageService {
  async saveTag(): Promise<SaveTagResult> {
    return Promise.resolve({
      success: false,
      validation: {
        valid: false,
        errors: ['Storage not available'],
        warnings: [],
      },
    });
  }
  async getTags(): Promise<Tag[]> {
    return Promise.resolve([]);
  }
  async updateTag(): Promise<void> {
    return Promise.resolve();
  }
  async deleteTag(): Promise<void> {
    return Promise.resolve();
  }
  async clearTags(): Promise<void> {
    return Promise.resolve();
  }
  async deduplicateTags(): Promise<number> {
    return Promise.resolve(0);
  }
}

export default TagStorageService;
