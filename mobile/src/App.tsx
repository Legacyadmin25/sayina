import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppStateProvider } from './contexts/AppStateContext';
import { AuthProvider } from './contexts/AuthContext';
import { BiometricAuthProvider } from './contexts/BiometricAuthContext';
import Navigation from './navigation';
import * as Linking from 'expo-linking';
import NotificationBannerController from './components/notifications/NotificationBannerController';
import { useAppTheme } from './utils/theme';

// Create a client for react-query
const queryClient = new QueryClient();

export default function App() {
  const [initialUrl, setInitialUrl] = React.useState<string | null>(null);
  const theme = useAppTheme();

  // Get initial URL that opened the app
  React.useEffect(() => {
    const getInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      setInitialUrl(url);
    };

    getInitialUrl();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <AppStateProvider>
            <AuthProvider>
              <BiometricAuthProvider>
                <Navigation initialUrl={initialUrl} />
                <NotificationBannerController />
                <StatusBar style="auto" />
              </BiometricAuthProvider>
            </AuthProvider>
          </AppStateProvider>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
