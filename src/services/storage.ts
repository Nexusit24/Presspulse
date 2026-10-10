/**
 * IndexedDB storage service for PressPulse
 * Stores drafts, connection credentials, and offline cache.
 */

import { ConnectionConfig, LocalDraft, WordPressCategory } from '../types/wordpress';

const DB_NAME = 'presspulse_db';
const DB_VERSION = 1;

const STORES = {
  DRAFTS: 'drafts',
  SETTINGS: 'settings',
  CATEGORIES: 'categories',
};

class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported on this device.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
          db.createObjectStore(STORES.DRAFTS, { keyPath: 'localId' });
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
          db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Connection Settings ---

  async saveConnection(config: ConnectionConfig): Promise<void> {
    if (config.rememberCredentials) {
      // Clear sessionStorage if switching to persistent
      sessionStorage.removeItem('presspulse_connection');
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SETTINGS, 'readwrite');
        const store = tx.objectStore(STORES.SETTINGS);
        store.put({ key: 'connection', value: config });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } else {
      // Session-only: store in sessionStorage and wipe from IndexedDB
      sessionStorage.setItem('presspulse_connection', JSON.stringify(config));
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SETTINGS, 'readwrite');
        const store = tx.objectStore(STORES.SETTINGS);
        store.delete('connection');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  async getConnection(): Promise<ConnectionConfig | null> {
    // Check sessionStorage first (session-only takes precedence)
    const sessionData = sessionStorage.getItem('presspulse_connection');
    if (sessionData) {
      try {
        return JSON.parse(sessionData) as ConnectionConfig;
      } catch {
        // ignore
      }
    }

    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SETTINGS, 'readonly');
        const store = tx.objectStore(STORES.SETTINGS);
        const req = store.get('connection');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve(req.result.value as ConnectionConfig);
          } else {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async clearConnection(): Promise<void> {
    sessionStorage.removeItem('presspulse_connection');
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.SETTINGS, 'readwrite');
        const store = tx.objectStore(STORES.SETTINGS);
        store.delete('connection');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // ignore
    }
  }

  // --- Draft Management ---

  async saveDraft(draft: LocalDraft): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DRAFTS, 'readwrite');
      const store = tx.objectStore(STORES.DRAFTS);
      store.put(draft);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getDraft(localId: string): Promise<LocalDraft | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DRAFTS, 'readonly');
      const store = tx.objectStore(STORES.DRAFTS);
      const req = store.get(localId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllDrafts(): Promise<LocalDraft[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DRAFTS, 'readonly');
      const store = tx.objectStore(STORES.DRAFTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list: LocalDraft[] = req.result || [];
        // Sort newest first
        list.sort((a, b) => b.lastLocalModified - a.lastLocalModified);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async deleteDraft(localId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DRAFTS, 'readwrite');
      const store = tx.objectStore(STORES.DRAFTS);
      store.delete(localId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAllDrafts(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DRAFTS, 'readwrite');
      const store = tx.objectStore(STORES.DRAFTS);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Category Cache ---

  async saveCategories(categories: WordPressCategory[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORES.CATEGORIES);
      store.clear();
      categories.forEach((cat) => store.put(cat));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getCachedCategories(): Promise<WordPressCategory[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORES.CATEGORIES, 'readonly');
        const store = tx.objectStore(STORES.CATEGORIES);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }
}

export const storageService = new StorageService();
