import '@/app/globals.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import ToastProvider from '@/components/ui/ToastProvider';
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import { initSyncListener } from '@/utils/syncManager';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }));

  // Initialize sync listener for offline operations
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      // Initialize the sync listener to handle background sync operations
      initSyncListener();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative">
        {/* Fixed position container for offline indicator */}
        <div className="fixed top-2 right-2 z-50">
          <OfflineIndicator />
        </div>
        
        {/* Install prompt will show conditionally based on internal logic */}
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <InstallPrompt />
        </div>
        
        <ToastProvider />
        <Component {...pageProps} />
      </div>
    </QueryClientProvider>
  );
}
