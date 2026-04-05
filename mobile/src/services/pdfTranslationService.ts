import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supported languages for PDF translation
 * Includes all 11 official South African languages
 */
export enum TranslationLanguage {
  ENGLISH = 'en',
  AFRIKAANS = 'af',
  ZULU = 'zu',
  XHOSA = 'xh',
  SOUTHERN_SOTHO = 'st',
  TSWANA = 'tn',
  NORTHERN_SOTHO = 'nso',
  VENDA = 've',
  TSONGA = 'ts',
  SWATI = 'ss',
  NDEBELE = 'nr'
}

/**
 * Language display names mapping
 */
export const LanguageNames: Record<TranslationLanguage, string> = {
  [TranslationLanguage.ENGLISH]: 'English',
  [TranslationLanguage.AFRIKAANS]: 'Afrikaans',
  [TranslationLanguage.ZULU]: 'isiZulu',
  [TranslationLanguage.XHOSA]: 'isiXhosa',
  [TranslationLanguage.SOUTHERN_SOTHO]: 'Sesotho',
  [TranslationLanguage.TSWANA]: 'Setswana',
  [TranslationLanguage.NORTHERN_SOTHO]: 'Sepedi',
  [TranslationLanguage.VENDA]: 'Tshivenda',
  [TranslationLanguage.TSONGA]: 'Xitsonga',
  [TranslationLanguage.SWATI]: 'siSwati',
  [TranslationLanguage.NDEBELE]: 'isiNdebele'
};

/**
 * Translation status states
 */
export enum TranslationStatus {
  IDLE = 'idle',
  TRANSLATING = 'translating',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * PDF Translation metadata interface
 */
interface TranslationMeta {
  originalUrl: string;
  translatedUrl: string;
  targetLanguage: TranslationLanguage;
  createdAt: number;
  size: number;
}

/**
 * Translation cache and service for PDFs
 */
class PdfTranslationService {
  private static instance: PdfTranslationService;
  private meta: TranslationMeta[] = [];
  private translationStatus: Record<string, TranslationStatus> = {};
  private CACHE_KEY = 'PDF_TRANSLATION_META';
  private MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB translation cache limit
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.init();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): PdfTranslationService {
    if (!PdfTranslationService.instance) {
      PdfTranslationService.instance = new PdfTranslationService();
    }
    return PdfTranslationService.instance;
  }
  
  /**
   * Initialize translation service
   */
  private async init(): Promise<void> {
    try {
      // Load cached metadata
      const metaJson = await AsyncStorage.getItem(this.CACHE_KEY);
      if (metaJson) {
        this.meta = JSON.parse(metaJson);
        console.log(`Loaded ${this.meta.length} translation entries from cache`);
      }
      
      // Verify cache entries exist
      await this.validateCache();
    } catch (error) {
      console.error('Error initializing PDF translation service:', error);
      // Reset cache on error
      this.meta = [];
      await this.saveMeta();
    }
  }
  
  /**
   * Validate that cached translations exist in the file system
   */
  private async validateCache(): Promise<void> {
    const validEntries: TranslationMeta[] = [];
    
    for (const entry of this.meta) {
      try {
        const info = await FileSystem.getInfoAsync(entry.translatedUrl);
        if (info.exists) {
          validEntries.push(entry);
        } else {
          console.log(`Removing invalid translation cache entry: ${entry.translatedUrl}`);
        }
      } catch (error) {
        console.error('Error validating cache entry:', error);
      }
    }
    
    if (validEntries.length !== this.meta.length) {
      this.meta = validEntries;
      await this.saveMeta();
    }
  }
  
  /**
   * Save metadata to persistent storage
   */
  private async saveMeta(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(this.meta));
    } catch (error) {
      console.error('Error saving translation metadata:', error);
    }
  }
  
  /**
   * Enforce cache size limit using LRU policy
   */
  private async enforceLimit(): Promise<void> {
    let totalSize = this.meta.reduce((sum, entry) => sum + entry.size, 0);
    
    // Sort by creation date (oldest first)
    const sortedEntries = [...this.meta].sort((a, b) => a.createdAt - b.createdAt);
    
    while (totalSize > this.MAX_CACHE_SIZE && sortedEntries.length > 0) {
      const oldestEntry = sortedEntries.shift();
      if (!oldestEntry) break;
      
      try {
        // Remove file from filesystem
        await FileSystem.deleteAsync(oldestEntry.translatedUrl, { idempotent: true });
        
        // Remove from metadata
        this.meta = this.meta.filter(entry => entry.translatedUrl !== oldestEntry.translatedUrl);
        
        totalSize -= oldestEntry.size;
        console.log(`Removed old translation from cache: ${oldestEntry.translatedUrl}, freed ${oldestEntry.size} bytes`);
      } catch (error) {
        console.error('Error removing old translation:', error);
      }
    }
    
    await this.saveMeta();
  }
  
  /**
   * Get translation status for a specific PDF URL and target language
   */
  public getTranslationStatus(url: string, targetLanguage: TranslationLanguage): TranslationStatus {
    const key = `${url}_${targetLanguage}`;
    return this.translationStatus[key] || TranslationStatus.IDLE;
  }
  
  /**
   * Find cached translation for a PDF
   */
  private findCachedTranslation(url: string, targetLanguage: TranslationLanguage): TranslationMeta | undefined {
    return this.meta.find(entry => 
      entry.originalUrl === url && entry.targetLanguage === targetLanguage
    );
  }
  
  /**
   * Translate a PDF to the target language
   * Returns the local URI of the translated PDF
   */
  public async translatePdf(
    url: string, 
    targetLanguage: TranslationLanguage,
    progressCallback?: (progress: number) => void
  ): Promise<string> {
    try {
      // Set status to translating
      const statusKey = `${url}_${targetLanguage}`;
      this.translationStatus[statusKey] = TranslationStatus.TRANSLATING;
      
      // Check if already translated
      const existingTranslation = this.findCachedTranslation(url, targetLanguage);
      if (existingTranslation) {
        this.translationStatus[statusKey] = TranslationStatus.COMPLETED;
        return existingTranslation.translatedUrl;
      }
      
      // Create filename for translated version
      const filename = `${encodeURIComponent(url)}_${targetLanguage}.pdf`;
      const translatedUri = `${FileSystem.cacheDirectory}translations/${filename}`;
      
      // Create translations directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.cacheDirectory}translations`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}translations`, { intermediates: true });
      }
      
      // Call translation API
      // In a real implementation, this would call your backend translation API
      // For now, we'll simulate translation by copying the original file
      progressCallback?.(0.1);
      
      // In a real implementation, you would:
      // 1. Upload the PDF to your translation API
      // 2. Wait for translation to complete (possibly with progress updates)
      // 3. Download the translated PDF
      
      // For demonstration, we'll copy the original file and consider it "translated"
      // This would be replaced with actual API calls in production
      
      // First, make sure we have the original file locally
      let localPdfUri = url;
      if (!url.startsWith('file://')) {
        // Download original PDF if it's a remote URL
        localPdfUri = `${FileSystem.cacheDirectory}${encodeURIComponent(url)}`;
        await FileSystem.downloadAsync(url, localPdfUri);
      }
      
      // Simulate translation processing time
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, 300));
        progressCallback?.(0.1 + (i / steps) * 0.8);
      }
      
      // Copy file to translations directory by reading and writing
      // For local files, we need to use file:// protocol
      const fileProtocolUri = localPdfUri.startsWith('file://') ? localPdfUri : `file://${localPdfUri}`;
      
      // Download from the file:// URI to the target location
      // This effectively copies the file
      await FileSystem.downloadAsync(fileProtocolUri, translatedUri);
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(translatedUri);
      if (!fileInfo.exists) {
        throw new Error('Translation failed: translated file not found');
      }
      
      // Add to metadata
      const newEntry: TranslationMeta = {
        originalUrl: url,
        translatedUrl: translatedUri,
        targetLanguage,
        createdAt: Date.now(),
        size: fileInfo.size || 0
      };
      
      this.meta.push(newEntry);
      
      // Enforce cache size limit
      await this.enforceLimit();
      await this.saveMeta();
      
      progressCallback?.(1);
      this.translationStatus[statusKey] = TranslationStatus.COMPLETED;
      
      return translatedUri;
    } catch (error) {
      console.error('PDF translation error:', error);
      this.translationStatus[`${url}_${targetLanguage}`] = TranslationStatus.FAILED;
      throw new Error(`Failed to translate PDF: ${error}`);
    }
  }
  
  /**
   * Clear all translated PDFs from cache
   */
  public async clearTranslations(): Promise<void> {
    try {
      // Delete all translation files
      for (const entry of this.meta) {
        await FileSystem.deleteAsync(entry.translatedUrl, { idempotent: true });
      }
      
      // Clear metadata
      this.meta = [];
      this.translationStatus = {};
      await this.saveMeta();
      
      console.log('Translation cache cleared');
    } catch (error) {
      console.error('Error clearing translation cache:', error);
      throw error;
    }
  }
  
  /**
   * Get list of available translations
   */
  public getAvailableTranslations(): TranslationMeta[] {
    return [...this.meta];
  }
  
  /**
   * Get total size of translation cache
   */
  public getTotalCacheSize(): number {
    return this.meta.reduce((sum, entry) => sum + entry.size, 0);
  }
}

export default PdfTranslationService;
