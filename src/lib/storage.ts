/**
 * Raw key/value persistence. The only module in the app that imports
 * AsyncStorage. Swapping to MMKV or a remote KV is a change to this file
 * and nothing else.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'nomadalingo:';

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(NS + key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(NS + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('[storage] write failed', key, e);
      return false;
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(NS + key);
    } catch {
      /* nothing useful to do */
    }
  },

  async keys(): Promise<string[]> {
    try {
      const all = await AsyncStorage.getAllKeys();
      return all.filter((k) => k.startsWith(NS));
    } catch {
      return [];
    }
  },

  /** Approximate bytes used, for the Settings storage row. */
  async usageKb(): Promise<number> {
    try {
      const keys = await this.keys();
      if (!keys.length) return 0;
      const pairs = await AsyncStorage.multiGet(keys);
      const bytes = pairs.reduce((n, [, v]) => n + (v ? v.length : 0), 0);
      return Math.max(1, Math.round(bytes / 1024));
    } catch {
      return 0;
    }
  },

  async clearAll(): Promise<void> {
    const keys = await this.keys();
    if (keys.length) await AsyncStorage.multiRemove(keys);
  },
};
