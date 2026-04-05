import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { en } from './translations/en';
import { af } from './translations/af';
import { zu } from './translations/zu';
import { xh } from './translations/xh';
import { nso } from './translations/nso';
import { tn } from './translations/tn';
import { st } from './translations/st';
import { ts } from './translations/ts';
import { ss } from './translations/ss';
import { ve } from './translations/ve';
import { nr } from './translations/nr';

// Create an i18n instance
const i18n = new I18n();

// Storage key for language preference
const LANGUAGE_PREFERENCE_KEY = 'language_preference';

/**
 * Service for managing translations and language preferences
 */
class TranslationService {
  private i18n: I18n;
  private initialized: boolean = false;

  constructor() {
    this.i18n = i18n;
    this.i18n.enableFallback = true;
    this.i18n.defaultLocale = 'en';
  }

  /**
   * Initialize the translation service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Set up translations
    this.i18n.translations = {
      en, // English
      af, // Afrikaans
      zu, // isiZulu
      xh, // isiXhosa
      nso, // Sepedi (Northern Sotho)
      tn, // Setswana
      st, // Sesotho (Southern Sotho)
      ts, // Xitsonga
      ss, // siSwati
      ve, // Tshivenda
      nr, // isiNdebele
    };

    // Load saved language preference
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY);
      if (savedLanguage) {
        this.i18n.locale = savedLanguage;
      } else {
        // Use device locale or default to English
        const deviceLocale = Localization.locale.split('-')[0];
        this.setLanguage(this.isSupported(deviceLocale) ? deviceLocale : 'en');
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
      this.i18n.locale = 'en';
    }

    this.initialized = true;
  }

  /**
   * Get a translated string by key
   * @param key Translation key
   * @param params Optional parameters for interpolation
   */
  translate(key: string, params?: Record<string, any>): string {
    if (!this.initialized) {
      console.warn('Translation service not initialized');
    }
    return this.i18n.t(key, params);
  }

  /**
   * Set the current language
   * @param language Language code
   */
  async setLanguage(language: string): Promise<void> {
    if (this.isSupported(language)) {
      this.i18n.locale = language;
      try {
        await AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, language);
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    } else {
      console.warn(`Language not supported: ${language}`);
    }
  }

  /**
   * Get the current language
   */
  getCurrentLanguage(): string {
    return this.i18n.locale;
  }

  /**
   * Check if a language is supported
   * @param language Language code
   */
  isSupported(language: string): boolean {
    return Object.keys(this.i18n.translations).includes(language);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): Language[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans' },
      { code: 'zu', name: 'isiZulu', nativeName: 'isiZulu' },
      { code: 'xh', name: 'isiXhosa', nativeName: 'isiXhosa' },
      { code: 'nso', name: 'Sepedi', nativeName: 'Sepedi' },
      { code: 'tn', name: 'Setswana', nativeName: 'Setswana' },
      { code: 'st', name: 'Sesotho', nativeName: 'Sesotho' },
      { code: 'ts', name: 'Xitsonga', nativeName: 'Xitsonga' },
      { code: 'ss', name: 'siSwati', nativeName: 'siSwati' },
      { code: 've', name: 'Tshivenda', nativeName: 'Tshivenḓa' },
      { code: 'nr', name: 'isiNdebele', nativeName: 'isiNdebele' },
    ];
  }
}

// Types
export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export default new TranslationService();
