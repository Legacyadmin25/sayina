import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Keyboard, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Checkbox, HelperText } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometricAuth } from '../../contexts/BiometricAuthContext';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Animatable from 'react-native-animatable';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { signIn, isAuthenticating } = useAuth();
  const { isBiometricAvailable, isBiometricEnrolled, authenticateWithBiometrics } = useBiometricAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Check if biometric login should be shown
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      if (isBiometricAvailable && isBiometricEnrolled) {
        setShowBiometric(true);
      }
    };

    checkBiometricAvailability();
  }, [isBiometricAvailable, isBiometricEnrolled]);

  // Keyboard visibility
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Validate email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Invalid email format');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Validate password
  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Handle login
  const handleLogin = async () => {
    // Validate form
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      if (isOffline) {
        Alert.alert(
          'Offline Mode',
          'You need an internet connection to sign in. Please connect to the internet and try again.'
        );
        return;
      }

      await signIn(email, password, rememberMe);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        'Invalid email or password. Please try again.'
      );
    }
  };

  // Handle biometric login
  const handleBiometricLogin = async () => {
    try {
      const success = await authenticateWithBiometrics();
      
      if (success) {
        // BiometricAuthContext will navigate to main app on success
        console.log('Biometric authentication successful');
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAwareScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineMedium" style={styles.appName}>
            Sayina
          </Text>
          <Text variant="bodyLarge" style={styles.tagline}>
            Secure Document Signing
          </Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text variant="titleLarge" style={styles.formTitle}>
            Log In
          </Text>
          
          {isOffline && (
            <View style={styles.offlineMessage}>
              <Ionicons name="cloud-offline" size={24} color="#F44336" />
              <Text style={styles.offlineText}>
                You are offline. Sign in requires internet connection.
              </Text>
            </View>
          )}
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={text => {
              setEmail(text);
              validateEmail(text);
            }}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={!!emailError}
            left={<TextInput.Icon icon="email" />}
            disabled={isAuthenticating}
          />
          {emailError ? (
            <HelperText type="error" visible={!!emailError}>
              {emailError}
            </HelperText>
          ) : null}
          
          <TextInput
            label="Password"
            value={password}
            onChangeText={text => {
              setPassword(text);
              validatePassword(text);
            }}
            mode="outlined"
            style={styles.input}
            secureTextEntry={secureTextEntry}
            autoCapitalize="none"
            error={!!passwordError}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye' : 'eye-off'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
            disabled={isAuthenticating}
          />
          {passwordError ? (
            <HelperText type="error" visible={!!passwordError}>
              {passwordError}
            </HelperText>
          ) : null}
          
          <View style={styles.rememberContainer}>
            <Checkbox.Item
              label="Remember me"
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
              position="leading"
              style={styles.checkbox}
              labelStyle={styles.checkboxLabel}
              disabled={isAuthenticating}
            />
            
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              disabled={isAuthenticating}
            >
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            loading={isAuthenticating}
            disabled={isAuthenticating || isOffline}
          >
            Log In
          </Button>
          
          {showBiometric && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={isAuthenticating}
            >
              <Ionicons 
                name={Platform.OS === 'ios' ? 'ios-finger-print' : 'md-finger-print'} 
                size={28} 
                color="#DAB44A" 
              />
              <Text style={styles.biometricText}>Login with Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {!keyboardVisible && (
          <Animatable.View 
            style={styles.footer} 
            animation="fadeIn" 
            duration={500}
          >
            <Text style={styles.noAccountText}>Don't have an account?</Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Register')}
              style={styles.registerButton}
              disabled={isAuthenticating}
            >
              Create Account
            </Button>
          </Animatable.View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontWeight: 'bold',
    color: '#333333',
  },
  tagline: {
    color: '#757575',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  formTitle: {
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  offlineText: {
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    padding: 0,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  forgotPassword: {
    color: '#DAB44A',
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: 16,
    backgroundColor: '#DAB44A',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 24,
  },
  biometricText: {
    marginLeft: 8,
    color: '#333333',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    padding: 24,
  },
  noAccountText: {
    marginBottom: 8,
    color: '#757575',
  },
  registerButton: {
    width: 200,
  },
});

export default LoginScreen;
