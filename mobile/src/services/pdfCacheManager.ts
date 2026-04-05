import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200MB
const CACHE_META = 'pdfCacheMeta';

interface CacheEntry { url: string; path: string; size: number; lastAccess: number; }

export default class PdfCacheManager {
  private meta: CacheEntry[] = [];
  private initialized = false;

  async init() {
    if (this.initialized) return;
    
    try {
      const raw = await AsyncStorage.getItem(CACHE_META);
      this.meta = raw ? JSON.parse(raw) : [];
      await this.validateCache();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing PDF cache:', error);
      this.meta = [];
      await this.saveMeta();
    }
  }

  private async validateCache() {
    // Remove entries whose files no longer exist
    this.meta = await Promise.all(this.meta.map(async e => {
      const info = await FileSystem.getInfoAsync(e.path);
      return info.exists ? e : null;
    })).then(arr => arr.filter(Boolean) as CacheEntry[]);
    await this.saveMeta();
  }

  private async saveMeta() {
    await AsyncStorage.setItem(CACHE_META, JSON.stringify(this.meta));
  }

  private async enforceLimit() {
    let total = this.meta.reduce((sum, e) => sum + e.size, 0);
    while (total > MAX_CACHE_SIZE && this.meta.length) {
      // Evict least‐recently‐used
      this.meta.sort((a, b) => a.lastAccess - b.lastAccess);
      const evict = this.meta.shift()!;
      await FileSystem.deleteAsync(evict.path, { idempotent: true });
      total -= evict.size;
    }
    await this.saveMeta();
  }

  async getCachedPdf(url: string) {
    await this.init();
    
    // Check existing entry
    const now = Date.now();
    let entry = this.meta.find(e => e.url === url);
    if (entry) {
      entry.lastAccess = now;
      await this.saveMeta();
      return entry.path;
    }
    
    // Download & cache
    const uri = FileSystem.cacheDirectory + encodeURIComponent(url);
    try {
      const { size } = await FileSystem.downloadAsync(url, uri);
      entry = { url, path: uri, size, lastAccess: now };
      this.meta.push(entry);
      await this.enforceLimit();
      await this.saveMeta();
      return uri;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  async clearCache(entryUrl?: string) {
    await this.init();
    
    if (entryUrl) {
      const idx = this.meta.findIndex(e => e.url === entryUrl);
      if (idx >= 0) {
        await FileSystem.deleteAsync(this.meta[idx].path, { idempotent: true });
        this.meta.splice(idx, 1);
      }
    } else {
      // Full clear
      await Promise.all(this.meta.map(e => FileSystem.deleteAsync(e.path, { idempotent: true })));
      this.meta = [];
    }
    await this.saveMeta();
  }
  
  async getCacheStats() {
    await this.init();
    
    const totalSize = this.meta.reduce((sum, e) => sum + e.size, 0);
    return {
      totalSize,
      itemCount: this.meta.length,
      percentUsed: (totalSize / MAX_CACHE_SIZE) * 100
    };
  }
}
