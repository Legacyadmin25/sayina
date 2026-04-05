import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Constants
const CACHE_SIZE_LIMIT = 200 * 1024 * 1024; // 200MB cache limit
const PDF_CACHE_KEY = 'SAYINA_PDF_CACHE_METADATA';
const PDF_CACHE_DIR = `${FileSystem.cacheDirectory}pdf_cache/`;

// Types
interface PdfCacheItem {
  id: string;
  uri: string;
  size: number;
  lastAccessed: number;
  name: string;
}

interface PdfCacheMetadata {
  totalSize: number;
  items: Record<string, PdfCacheItem>;
}

/**
 * PDF Cache Manager - Handles caching PDFs and memory management
 */
class PdfCacheManager {
  private metadata: PdfCacheMetadata = { totalSize: 0, items: {} };
  private initialized = false;

  /**
   * Initialize cache directory and load metadata
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Create cache directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(PDF_CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(PDF_CACHE_DIR, { intermediates: true });
      }
      
      // Load cache metadata
      const metadataString = await AsyncStorage.getItem(PDF_CACHE_KEY);
      if (metadataString) {
        this.metadata = JSON.parse(metadataString);
      }
      
      // Verify cache files actually exist, clean up if necessary
      await this.verifyCache();
      
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing PDF cache:', error);
      // Reset cache metadata if there was an error
      this.metadata = { totalSize: 0, items: {} };
      await this.saveMetadata();
    }
  }

  /**
   * Verify cache files exist and update metadata accordingly
   */
  private async verifyCache(): Promise<void> {
    const updatedItems: Record<string, PdfCacheItem> = {};
    let updatedSize = 0;
    
    for (const id in this.metadata.items) {
      const item = this.metadata.items[id];
      const fileInfo = await FileSystem.getInfoAsync(item.uri);
      
      if (fileInfo.exists) {
        updatedItems[id] = item;
        updatedSize += item.size;
      }
    }
    
    this.metadata.items = updatedItems;
    this.metadata.totalSize = updatedSize;
    await this.saveMetadata();
  }

  /**
   * Save metadata to AsyncStorage
   */
  private async saveMetadata(): Promise<void> {
    await AsyncStorage.setItem(PDF_CACHE_KEY, JSON.stringify(this.metadata));
  }

  /**
   * Get file from cache or download it
   */
  async getFile(id: string, url: string, name: string): Promise<string> {
    await this.initialize();
    
    // Check if file is already in cache
    if (this.metadata.items[id]) {
      const cachedItem = this.metadata.items[id];
      // Update last accessed time
      cachedItem.lastAccessed = Date.now();
      await this.saveMetadata();
      return cachedItem.uri;
    }
    
    // Download file
    const fileUri = `${PDF_CACHE_DIR}${id}_${name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    
    try {
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('Downloaded file does not exist');
      }
      
      // Make room in the cache if necessary
      await this.ensureCacheSize(fileInfo.size);
      
      // Add to cache metadata
      this.metadata.items[id] = {
        id,
        uri,
        size: fileInfo.size,
        lastAccessed: Date.now(),
        name
      };
      
      this.metadata.totalSize += fileInfo.size;
      await this.saveMetadata();
      
      return uri;
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }

  /**
   * Ensure cache size is under limit by removing least recently used files
   */
  private async ensureCacheSize(newFileSize: number): Promise<void> {
    if (this.metadata.totalSize + newFileSize <= CACHE_SIZE_LIMIT) {
      return;
    }
    
    // Sort cache items by last accessed time (oldest first)
    const sortedItems = Object.values(this.metadata.items).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );
    
    // Remove files until we have enough space
    let removedSize = 0;
    const itemsToRemove: string[] = [];
    
    for (const item of sortedItems) {
      itemsToRemove.push(item.id);
      removedSize += item.size;
      
      if (this.metadata.totalSize - removedSize + newFileSize <= CACHE_SIZE_LIMIT) {
        break;
      }
    }
    
    // Delete files and update metadata
    for (const id of itemsToRemove) {
      await this.removeFile(id);
    }
  }

  /**
   * Remove a file from the cache
   */
  async removeFile(id: string): Promise<void> {
    await this.initialize();
    
    if (!this.metadata.items[id]) {
      return;
    }
    
    const item = this.metadata.items[id];
    
    try {
      await FileSystem.deleteAsync(item.uri, { idempotent: true });
      this.metadata.totalSize -= item.size;
      delete this.metadata.items[id];
      await this.saveMetadata();
    } catch (error) {
      console.error(`Error removing file ${id} from cache:`, error);
    }
  }

  /**
   * Clear the entire cache
   */
  async clearCache(): Promise<void> {
    await this.initialize();
    
    try {
      await FileSystem.deleteAsync(PDF_CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(PDF_CACHE_DIR, { intermediates: true });
      
      this.metadata = { totalSize: 0, items: {} };
      await this.saveMetadata();
    } catch (error) {
      console.error('Error clearing PDF cache:', error);
    }
  }

  /**
   * Get the current cache statistics
   */
  async getCacheStats(): Promise<{
    totalSize: number;
    itemCount: number;
    percentUsed: number;
  }> {
    await this.initialize();
    
    return {
      totalSize: this.metadata.totalSize,
      itemCount: Object.keys(this.metadata.items).length,
      percentUsed: (this.metadata.totalSize / CACHE_SIZE_LIMIT) * 100
    };
  }
}

// Singleton instance
export const pdfCacheManager = new PdfCacheManager();

/**
 * WebView memory management utilities
 */
export const webViewMemoryUtils = {
  /**
   * Get the HTML content to optimize PDF rendering
   */
  getPdfHtmlContent(pdfUri: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <title>PDF Viewer</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background-color: #f5f5f5;
          }
          #pdf-viewer {
            width: 100%;
            height: 100%;
            display: block;
          }
        </style>
      </head>
      <body>
        <object id="pdf-viewer" data="${pdfUri}" type="application/pdf">
          <p>It appears your device doesn't support embedded PDFs. You can <a href="${pdfUri}">download the PDF</a> instead.</p>
        </object>
        <script>
          // Force garbage collection when possible on iOS WebView
          document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
              const viewer = document.getElementById('pdf-viewer');
              if (viewer) {
                viewer.data = '';
              }
            } else {
              const viewer = document.getElementById('pdf-viewer');
              if (viewer) {
                viewer.data = '${pdfUri}';
              }
            }
          });
          
          // Handle memory optimization
          window.addEventListener('pagehide', function() {
            const viewer = document.getElementById('pdf-viewer');
            if (viewer) {
              viewer.data = '';
            }
          });
        </script>
      </body>
      </html>
    `;
  },
  
  /**
   * Reset WebView memory usage
   * @param webViewRef React reference to WebView
   */
  resetWebViewMemory(webViewRef: any): void {
    if (!webViewRef || !webViewRef.current) return;
    
    if (Platform.OS === 'android') {
      // On Android, reload the WebView
      webViewRef.current.reload();
    } else {
      // On iOS, inject JavaScript to clean up memory
      webViewRef.current.injectJavaScript(`
        window.location.reload();
        true;
      `);
    }
  },
  
  /**
   * Optimize WebView for PDF rendering
   * @param webViewRef React reference to WebView
   */
  optimizePdfWebView(webViewRef: any): void {
    if (!webViewRef || !webViewRef.current) return;
    
    // Inject JavaScript to optimize PDF rendering
    webViewRef.current.injectJavaScript(`
      if (document.readyState === 'complete') {
        // Force reflow to improve rendering performance
        document.body.style.display = 'none';
        setTimeout(function() {
          document.body.style.display = '';
        }, 10);
        
        // Disable unnecessary features to improve performance
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'viewport');
        meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        document.head.appendChild(meta);
      }
      true;
    `);
  }
};
