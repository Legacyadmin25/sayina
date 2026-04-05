import React, { createContext, useContext, useState, useEffect } from 'react';
import { register, isIOS, isAndroidChrome, isHuaweiBrowser } from '../serviceWorkerRegistration';
import { getTotalQueueLength, processAllQueues } from '../services/offlineQueueService';

interface OfflineContextType {
  isOffline: boolean;
  queueLength: number;
  showInstallPrompt: boolean;
  installType: 'ios' | 'android' | 'huawei' | 'generic' | null;
  dismissInstallPrompt: () => void;
  refreshQueueStatus: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({
  isOffline: !navigator.onLine,
  queueLength: 0,
  showInstallPrompt: false,
  installType: null,
  dismissInstallPrompt: () => {},
  refreshQueueStatus: async () => {}
});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [installType, setInstallType] = useState<'ios' | 'android' | 'huawei' | 'generic' | null>(null);

  // Check if app is installed already
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect platform for install prompts
  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    // Only show install prompt after user has interacted with the site
    const handleUserInteraction = () => {
      // Detect platform
      if (isIOS()) {
        setInstallType('ios');
      } else if (isHuaweiBrowser()) {
        setInstallType('huawei');
      } else if (isAndroidChrome()) {
        setInstallType('android');
      } else {
        setInstallType('generic');
      }

      // Show install prompt
      setShowInstallPrompt(true);
      
      // Remove listener after first interaction
      window.removeEventListener('click', handleUserInteraction);
    };

    // Add listener after a delay to ensure the app has loaded
    const timer = setTimeout(() => {
      window.addEventListener('click', handleUserInteraction);
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  const refreshQueueStatus = async () => {
    const count = await getTotalQueueLength();
    setQueueLength(count);
  };

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Process queued operations when we go back online
      processAllQueues().then(refreshQueueStatus);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialize queue count
    refreshQueueStatus();

    // Register service worker
    register({
      onOffline: handleOffline,
      onOnline: handleOnline,
      onSuccess: () => {
        console.log('Service worker registered successfully');
      },
      onUpdate: () => {
        console.log('New content is available; please refresh.');
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dismiss install prompt
  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Store the decision in localStorage to avoid showing again for a week
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  };

  // Check queue status periodically
  useEffect(() => {
    const interval = setInterval(refreshQueueStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const value = {
    isOffline,
    queueLength,
    showInstallPrompt: !isInstalled && showInstallPrompt,
    installType,
    dismissInstallPrompt,
    refreshQueueStatus
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineContext;
