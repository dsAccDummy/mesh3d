// ============================================
// Mesh3D - IndexedDB Service (Gallery Persistence)
// ============================================

import { get, set, del, keys, entries, clear } from 'idb-keyval';
import type { ModelEntry } from '$lib/types';

const GALLERY_PREFIX = 'mesh3d_model_';
const BLOB_PREFIX = 'mesh3d_blob_';

export const db = {
  // --- Gallery Models ---
  async saveModel(entry: ModelEntry): Promise<void> {
    await set(GALLERY_PREFIX + entry.id, entry);
    // Save model blob separately if present
    if (entry.result.modelBlob) {
      await set(BLOB_PREFIX + entry.id, entry.result.modelBlob);
    }
  },

  async getModel(id: string): Promise<ModelEntry | undefined> {
    return get(GALLERY_PREFIX + id);
  },

  async getAllModels(): Promise<ModelEntry[]> {
    const allEntries = await entries();
    return allEntries
      .filter(([key]) => (key as string).startsWith(GALLERY_PREFIX))
      .map(([, value]) => value as ModelEntry)
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async getModelBlob(id: string): Promise<Blob | undefined> {
    return get(BLOB_PREFIX + id);
  },

  async deleteModel(id: string): Promise<void> {
    await del(GALLERY_PREFIX + id);
    await del(BLOB_PREFIX + id);
  },

  async deleteAllModels(): Promise<void> {
    const allKeys = await keys();
    for (const key of allKeys) {
      if ((key as string).startsWith(GALLERY_PREFIX) || (key as string).startsWith(BLOB_PREFIX)) {
        await del(key);
      }
    }
  },

  async getModelCount(): Promise<number> {
    const allKeys = await keys();
    return allKeys.filter(k => (k as string).startsWith(GALLERY_PREFIX)).length;
  },

  async getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const est = await navigator.storage.estimate();
      return { used: est.usage || 0, quota: est.quota || 0 };
    }
    return null;
  }
};
