import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useAuth } from '../contexts/AuthContext';
import { useBiometricAuth } from '../contexts/BiometricAuthContext';

// Screens
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import BiometricPromptScreen from '../screens/auth/BiometricPromptScreen';
import SigningScreen from '../screens/envelopes/SigningScreen';
import DocumentViewScreen from '../screens/documents/DocumentScreen';
import EnvelopeDetailsScreen from '../screens/envelopes/EnvelopeDetailsScreen';
import EnvelopeCreateScreen from '../screens/envelopes/EnvelopeCreateScreen';
import InvalidDeepLinkScreen from '../screens/error/InvalidDeepLinkScreen';

// Define the root stack navigator params
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  BiometricPrompt: undefined;
  Signing: { envelopeId: string; signerId?: string; token?: string };
  DocumentView: { documentId: string; mode?: 'view' | 'translate' };
  EnvelopeCreate: { templateId?: string };
  EnvelopeDetails: { envelopeId: string };
  InvalidDeepLink: { error: string; originalUrl?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Regular expressions for validating route parameters
const VALID_ID_REGEX = /^[a-zA-Z0-9-_]{8,64}$/;
const VALID_MODE_REGEX = /^(view|translate)$/;

// Create linking configuration for deep links
const linking: {prefixes: string[], config: any, getStateFromPath?: (path: string, options: any) => any} = {
  prefixes: ['sayina://', 'https://app.sayina.co.za', 'https://sayina.co.za'],
  config: {
    screens: {
      Signing: {
        path: 'sign/:envelopeId/:signerId?',
        parse: {
          envelopeId: (envelopeId: string) => {
            // Validate envelope ID format
            return VALID_ID_REGEX.test(envelopeId) ? envelopeId : '';
          },
          signerId: (signerId: string) => {
            // Validate signer ID format if present
            return signerId && VALID_ID_REGEX.test(signerId) ? signerId : undefined;
          },
        },
        stringify: {
          envelopeId: (id: string) => id,
          signerId: (id: string | undefined) => id || '',
        },
      },
      DocumentView: {
        path: 'documents/:documentId/:mode?',
        parse: {
          documentId: (documentId: string) => {
            // Validate document ID format
            return VALID_ID_REGEX.test(documentId) ? documentId : '';
          },
          mode: (mode: string) => {
            // Validate mode is either view or translate
            return VALID_MODE_REGEX.test(mode) ? mode as 'view' | 'translate' : 'view';
          },
        },
        stringify: {
          documentId: (id: string) => id,
          mode: (mode: string | undefined) => mode || 'view',
        },
      },
      EnvelopeCreate: {
        path: 'create/:templateId?',
        parse: {
          templateId: (templateId: string) => {
            // Validate template ID format if present
            return templateId && VALID_ID_REGEX.test(templateId) ? templateId : undefined;
          },
        },
        stringify: {
          templateId: (id: string | undefined) => id || '',
        },
      },
      EnvelopeDetails: {
        path: 'envelopes/:envelopeId',
        parse: {
          envelopeId: (envelopeId: string) => {
            // Validate envelope ID format
            return VALID_ID_REGEX.test(envelopeId) ? envelopeId : '';
          },
        },
        stringify: {
          envelopeId: (id: string) => id,
        },
      },
      InvalidDeepLink: 'error',
      Main: '',
    },
  },
  // Enhanced error handling for deep links
  getStateFromPath: (path: string, options: any) => {
    try {
      // First try to parse the path normally
      const state = Linking.getStateFromPath(path, options);
      
      // Check if we got a valid route and parameters
      if (state && state.routes && state.routes.length > 0) {
        const route = state.routes[state.routes.length - 1];
        
        // Validate route parameters based on route name
        if (route.name === 'Signing' && (!route.params?.envelopeId || route.params.envelopeId === '')) {
          throw new Error('Invalid envelope ID for signing');
        }
        
        if (route.name === 'DocumentView' && (!route.params?.documentId || route.params.documentId === '')) {
          throw new Error('Invalid document ID for viewing');
        }
        
        if (route.name === 'EnvelopeDetails' && (!route.params?.envelopeId || route.params.envelopeId === '')) {
          throw new Error('Invalid envelope ID for details');
        }
      }
      
      return state;
    } catch (error) {
      console.error('Deep link error:', error);
      return {
        routes: [
          {
            name: 'InvalidDeepLink',
            params: { 
              error: error instanceof Error ? error.message : 'Invalid or expired link', 
              originalUrl: path 
            },
          },
        ],
      };
    }
  },
};

export default function Navigation({ initialUrl }: { initialUrl: string | null }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { isBiometricEnabled } = useBiometricAuth();

  // Enhanced theme that matches our Sayina branding
  const MyTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: '#DAB44A',
      background: '#F5F5F5',
      card: '#FFFFFF',
      text: '#333333',
      border: '#E0E0E0',
    },
  };

  // Create a navigation ref to use for programmatic navigation
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Parse deep link if initialUrl is provided and set up listeners for new links
  useEffect(() => {
    // Handle the initial URL that opened the app
    if (initialUrl) {
      const parsedUrl = Linking.parse(initialUrl);
      console.log('Initial deep link detected:', parsedUrl);
    }

    // Set up a listener for new URLs that open the app while it's already running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('New deep link detected while app running:', url);
      // The navigation container will automatically handle this URL through the linking prop
    });

    // Handle link errors manually through our error screen if needed
    const handleError = (error: Error) => {
      console.error('Deep link error:', error);
      if (navigationRef.current) {
        navigationRef.current.navigate('InvalidDeepLink', { 
          error: 'Failed to process link: ' + error.message,
          originalUrl: 'unknown'
        });
      }
    };

    return () => {
      subscription.remove();
    };
  }, [initialUrl]);

  if (isLoading) {
    // You could return a loading screen here
    return null;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      theme={MyTheme}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Not authenticated, show auth screens
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          // Authenticated, check for biometric if enabled
          isBiometricEnabled ? (
            <Stack.Screen name="BiometricPrompt" component={BiometricPromptScreen} />
          ) : (
            <Stack.Screen name="Main" component={MainStack} />
          )
        )}
        {/* Screens accessible via deep links even when not authenticated */}
        <Stack.Screen name="Signing" component={SigningScreen} />
        <Stack.Screen name="DocumentView" component={DocumentViewScreen} />
        <Stack.Screen name="EnvelopeCreate" component={EnvelopeCreateScreen} />
        <Stack.Screen name="EnvelopeDetails" component={EnvelopeDetailsScreen} />
        <Stack.Screen name="InvalidDeepLink" component={InvalidDeepLinkScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
