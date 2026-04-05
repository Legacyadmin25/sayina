import React, { useState, useEffect } from 'react';
// Using the app's translation hook instead of direct next-i18next import
import { useTranslation } from '@/hooks/useTranslation';

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * OfflineIndicator component shows the current network status and
 * the number of pending operations in the background sync queue.
 */
const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const { t } = useTranslation('common');
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOperations, setPendingOperations] = useState(0);

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    // Add event listeners for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Function to check the background sync queue
    const checkSyncQueue = async () => {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          // Get the registered service worker
          const registration = await navigator.serviceWorker.ready;
          
          // Check if there is a background sync queue
          // Using type assertion because TypeScript doesn't recognize the sync property
          const regWithSync = registration as ServiceWorkerRegistration & {
            sync?: {
              getTags: () => Promise<string[]>;
              register: (tag: string) => Promise<void>;
            };
          };
          
          if (regWithSync.sync) {
            // Get the sync tags (we set 'api-queue' in our next.config.js)
            const tags = await regWithSync.sync.getTags();
            
            // Check if our queue tag exists
            if (tags.includes('api-queue')) {
              // If we had access to the actual queue count, we would use it here
              // For now, we'll just indicate there are pending operations
              setPendingOperations(1);
            } else {
              setPendingOperations(0);
            }
          }
        } catch (error) {
          console.error('Error checking sync queue:', error);
        }
      }
    };

    // Check the queue initially and then every 5 seconds
    checkSyncQueue();
    const interval = setInterval(checkSyncQueue, 5000);

    // Add listener for custom events from the service worker
    const handleSyncUpdate = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.pendingOperations === 'number') {
        setPendingOperations(event.detail.pendingOperations);
      }
    };

    window.addEventListener('sync-update', handleSyncUpdate as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-update', handleSyncUpdate as EventListener);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && pendingOperations === 0) {
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      {!isOnline && (
        <div className="flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm mr-2">
          <svg 
            className="w-4 h-4 mr-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          <span>{t('offline_mode', 'Offline Mode')}</span>
        </div>
      )}
      
      {pendingOperations > 0 && (
        <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          <svg 
            className="w-4 h-4 mr-1" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>
            {t('pending_operations', 'Pending: {{count}}', { count: pendingOperations })}
          </span>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
