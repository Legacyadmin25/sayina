import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from 'react-query';
import { PaperProvider } from 'react-native-paper';
import { theme } from './src/constants/theme';
import useCachedResources from './src/hooks/useCachedResources';
import Navigation from './src/navigation';
import { AuthProvider } from './src/contexts/AuthContext';
import { BiometricAuthProvider } from './src/contexts/BiometricAuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const isLoadingComplete = useCachedResources();
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  
  // Handle deep linking
  useEffect(() => {
    // Handle app opened from deep link
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        setInitialUrl(initialUrl);
      }
    };

    getInitialURL();

    // Set up deep link event listener
    const subscription = Linking.addEventListener('url', ({ url }) => {
      setInitialUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isLoadingComplete) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <LanguageProvider>
            <AuthProvider>
              <BiometricAuthProvider>
                <NotificationProvider>
                  <Navigation initialUrl={initialUrl} />
                  <StatusBar style="auto" />
                </NotificationProvider>
              </BiometricAuthProvider>
            </AuthProvider>
          </LanguageProvider>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
