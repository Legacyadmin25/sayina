import { useCallback, useState } from 'react';

interface Language {
  code: string;
  name: string;
}

const AVAILABLE_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'zu', name: 'Zulu' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'st', name: 'Sotho' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'es', name: 'Spanish' },
];

/**
 * Simple translation hook for Sayina
 * This serves as a wrapper around the app's translation functionality,
 * which might be next-i18next or another library.
 */
export function useTranslation(namespace: string = 'common') {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Function to translate keys
  const t = useCallback((key: string, defaultValue?: string, options?: Record<string, any>) => {
    // For now, just return the default value or the key if no default provided
    // In a real implementation, this would use the actual translation library
    if (options) {
      // Handle simple interpolation for count variables
      let result = defaultValue || key;

      Object.entries(options).forEach(([optionKey, optionValue]) => {
        result = result.replace(`{{${optionKey}}}`, String(optionValue));
      });

      return result;
    }

    return defaultValue || key;
  }, [namespace]);

  const getAvailableLanguages = useCallback((): Language[] => {
    return AVAILABLE_LANGUAGES;
  }, []);

  return { t, getAvailableLanguages, currentLanguage, setCurrentLanguage };
}

export default useTranslation;
