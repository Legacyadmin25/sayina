import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Image, BackHandler, ActivityIndicator } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useBiometricAuth } from '../../contexts/BiometricAuthContext';
import { useNavigation, useIsFocused, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'BiometricPrompt'>;

const BiometricPromptScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { authenticateWithBiometrics, isBiometricAvailable, isLocked, unlockApp, timeoutMinutes } = useBiometricAuth();
  const { signOut } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authAttempts, setAuthAttempts] = useState(0);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const isFocused = useIsFocused();

  // Attempt biometric authentication when screen loads or comes into focus
  useEffect(() => {
    if (isFocused) {
      handleAuthenticate();
    }
  }, [isFocused]);
  
  // Handle back button to prevent bypassing biometric authentication
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isLocked) {
          // Prevent going back if the app is locked
          return true;
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [isLocked])
  );
  
  // Show skip button only after multiple attempts or if not locked
  useEffect(() => {
    if (authAttempts >= 2 || !isLocked) {
      setShowSkipButton(true);
    }
  }, [authAttempts, isLocked]);

  const handleAuthenticate = async () => {
    if (isAuthenticating) return;
    
    setIsAuthenticating(true);
    try {
      const success = await authenticateWithBiometrics();
      
      if (success) {
        // Authentication successful
        if (isLocked) {
          // If locked due to inactivity, unlock the app
          unlockApp();
        }
        // Navigate to main app
        navigation.replace('Main');
      } else {
        // Authentication failed, increment attempts
        setAuthAttempts(prev => prev + 1);
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSkip = () => {
    // Skip biometric authentication for this session only
    navigation.replace('Main');
  };

  const handleSignOut = () => {
    // Sign out user
    signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome Back
        </Text>
        
        <Text variant="bodyLarge" style={styles.description}>
          {isLocked 
            ? `Your session timed out after ${timeoutMinutes} minutes of inactivity. Please authenticate to continue.` 
            : 'Please authenticate using your biometrics to access your account.'}
        </Text>
        
        {authAttempts > 0 && (
          <Text style={styles.errorText}>
            Authentication failed. Please try again.
          </Text>
        )}
        
        <Button
          mode="contained"
          onPress={handleAuthenticate}
          style={styles.button}
          loading={isAuthenticating}
          disabled={isAuthenticating || !isBiometricAvailable}
        >
          {isBiometricAvailable ? 'Authenticate with Biometrics' : 'Biometrics Not Available'}
        </Button>
        
        {showSkipButton && (
          <Button
            mode="outlined"
            onPress={handleSkip}
            style={styles.button}
          >
            {isLocked ? 'Bypass Lock (This Session Only)' : 'Skip for Now'}
          </Button>
        )}
        
        <Button
          mode="text"
          onPress={handleSignOut}
          style={styles.signOutButton}
        >
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666666',
  },
  button: {
    width: '100%',
    marginVertical: 8,
  },
  signOutButton: {
    marginTop: 32,
  },
  errorText: {
    color: '#B00020',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default BiometricPromptScreen;
