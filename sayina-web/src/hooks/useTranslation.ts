import { useCallback } from 'react';

/**
 * Simple translation hook for Sayina
 * This serves as a wrapper around the app's translation functionality,
 * which might be next-i18next or another library.
 */
export function useTranslation(namespace: string = 'common') {
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

  return { t };
}

export default useTranslation;
