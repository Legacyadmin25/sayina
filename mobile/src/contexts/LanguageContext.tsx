import React, { createContext, useContext, useState, useEffect } from 'react';
import translationService, { Language } from '../services/i18n/translationService';

interface LanguageContextData {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  t: (key: string, params?: Record<string, any>) => string;
  supportedLanguages: Language[];
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextData>({} as LanguageContextData);

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [initialized, setInitialized] = useState(false);
  const supportedLanguages = translationService.getSupportedLanguages();
  
  // RTL languages (none in the current South African context, but included for future extensibility)
  const rtlLanguages: string[] = [];
  
  // Initialize translation service
  useEffect(() => {
    const init = async () => {
      await translationService.initialize();
      setCurrentLanguage(translationService.getCurrentLanguage());
      setInitialized(true);
    };
    
    init();
  }, []);
  
  // Change language
  const changeLanguage = async (language: string) => {
    if (translationService.isSupported(language)) {
      await translationService.setLanguage(language);
      setCurrentLanguage(language);
    }
  };
  
  // Translate function
  const t = (key: string, params?: Record<string, any>): string => {
    return translationService.translate(key, params);
  };
  
  // Check if current language is RTL
  const isRtl = rtlLanguages.includes(currentLanguage);
  
  // Show loading until translations are initialized
  if (!initialized) {
    return null;
  }
  
  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        t,
        supportedLanguages,
        isRtl,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
