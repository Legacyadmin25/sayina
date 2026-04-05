import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform, AppState, AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import securityService from '../services/securityService';

interface BiometricAuthContextData {
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  isBiometricEnrolled: boolean;
  isLocked: boolean;
  timeoutMinutes: number;
  authenticateWithBiometrics: () => Promise<boolean>;
  enableBiometricAuth: () => Promise<boolean>;
  disableBiometricAuth: () => Promise<void>;
  lockApp: () => void;
  unlockApp: () => void;
  setAutoLockTimeout: (minutes: number) => Promise<void>;
  resetInactivityTimer: () => void;
}

const BiometricAuthContext = createContext<BiometricAuthContextData>({} as BiometricAuthContextData);

export const useBiometricAuth = () => useContext(BiometricAuthContext);

export const BiometricAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBiometricAvailable, setBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setBiometricEnabled] = useState(false);
  const [isBiometricEnrolled, setBiometricEnrolled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(5); // Default 5 minutes
  const navigation = useNavigation();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    checkBiometricStatus();
    loadBiometricPreference();
    loadAutoLockSettings();
    
    // Add lock state listener from security service
    const removeLockListener = securityService.addLockListener((locked) => {
      setIsLocked(locked);
    });
    
    // Monitor app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      // Clean up listeners
      removeLockListener();
      subscription.remove();
    };
  }, []);
  
  // Update security service when biometric settings change
  useEffect(() => {
    if (isBiometricEnabled) {
      securityService.setAutoLockEnabled(true);
      securityService.setAutoLockTimeout(timeoutMinutes);
    } else {
      securityService.setAutoLockEnabled(false);
    }
  }, [isBiometricEnabled, timeoutMinutes]);

  const checkBiometricStatus = async () => {
    try {
      // Check if hardware supports biometrics
      const isHardwareSupported = await LocalAuthentication.hasHardwareAsync();
      setBiometricAvailable(isHardwareSupported);

      if (isHardwareSupported) {
        // Check if user has enrolled biometrics
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricEnrolled(isEnrolled);
      }
    } catch (error) {
      console.error('Error checking biometric status:', error);
    }
  };

  const loadBiometricPreference = async () => {
    try {
      const storedPreference = await SecureStore.getItemAsync('biometricAuthEnabled');
      setBiometricEnabled(storedPreference === 'true');
    } catch (error) {
      console.error('Error loading biometric preference:', error);
    }
  };

  const loadAutoLockSettings = async () => {
    try {
      // Get timeout from security service
      const timeout = securityService.getAutoLockTimeout();
      setTimeoutMinutes(timeout);
    } catch (error) {
      console.error('Error loading auto-lock settings:', error);
    }
  };
  
  // Handle app state changes
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // When app becomes active, check if we need to lock
    if (nextAppState === 'active' && isBiometricEnabled) {
      // Let security service handle the lock check
      securityService.checkLockStatus();
    }
    
    // Store the current app state
    appStateRef.current = nextAppState;
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    if (!isBiometricAvailable || !isBiometricEnrolled) {
      Alert.alert(
        'Biometric Authentication Unavailable',
        'Your device either does not support biometrics or you have not set up biometric authentication.'
      );
      return false;
    }

    try {
      // Use security service for biometric auth
      const success = await securityService.unlockWithBiometrics();
      
      if (success) {
        unlockApp();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return false;
    }
  };

  const enableBiometricAuth = async (): Promise<boolean> => {
    try {
      if (!isBiometricAvailable) {
        Alert.alert(
          'Biometric Authentication Not Available',
          'Your device does not support biometric authentication.'
        );
        return false;
      }

      if (!isBiometricEnrolled) {
        Alert.alert(
          'No Biometrics Enrolled',
          `Please set up ${Platform.OS === 'ios' ? 'Face ID/Touch ID' : 'fingerprint'} in your device settings first.`
        );
        return false;
      }

      // Test authentication before enabling
      const authResult = await authenticateWithBiometrics();
      
      if (authResult) {
        await SecureStore.setItemAsync('biometricAuthEnabled', 'true');
        setBiometricEnabled(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error enabling biometric auth:', error);
      return false;
    }
  };

  const disableBiometricAuth = async (): Promise<void> => {
    try {
      await SecureStore.setItemAsync('biometricAuthEnabled', 'false');
      setBiometricEnabled(false);
    } catch (error) {
      console.error('Error disabling biometric auth:', error);
    }
  };

  const lockApp = () => {
    // Use security service to lock the app
    securityService.setLocked(true);
  };

  const unlockApp = () => {
    // Use security service to unlock the app
    securityService.setLocked(false);
    // Reset activity time
    securityService.updateLastActiveTime();
  };

  const setAutoLockTimeout = async (minutes: number) => {
    try {
      // Use security service to update timeout
      await securityService.setAutoLockTimeout(minutes);
      setTimeoutMinutes(minutes);
      // Update security service with new timeout
      securityService.setAutoLockTimeout(minutes);
    } catch (error) {
      console.error('Error saving auto-lock timeout:', error);
    }
  };

  const resetInactivityTimer = () => {
    // Update last active time in security service
    securityService.updateLastActiveTime();
  };

  return (
    <BiometricAuthContext.Provider
      value={{
        isBiometricAvailable,
        isLocked,
        isBiometricEnabled,
        isBiometricEnrolled,
        timeoutMinutes,
        authenticateWithBiometrics,
        enableBiometricAuth,
        disableBiometricAuth,
        lockApp,
        unlockApp,
        setAutoLockTimeout,
        resetInactivityTimer,
      }}
    >
      {children}
    </BiometricAuthContext.Provider>
  );
};
