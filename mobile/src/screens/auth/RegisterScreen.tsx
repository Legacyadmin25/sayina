import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Keyboard, Platform, Alert, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText, Divider } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import * as Animatable from 'react-native-animatable';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { register, isAuthenticating } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [confirmSecureTextEntry, setConfirmSecureTextEntry] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Form validation errors
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [organizationError, setOrganizationError] = useState('');

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

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

  // Validate name
  const validateName = (name: string) => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    }
    setNameError('');
    return true;
  };

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
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter');
      return false;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Validate confirm password
  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  // Validate organization
  const validateOrganization = (organization: string) => {
    if (!organization.trim()) {
      setOrganizationError('Organization name is required');
      return false;
    }
    setOrganizationError('');
    return true;
  };

  // Handle registration
  const handleRegister = async () => {
    // Validate form
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);
    const isOrganizationValid = validateOrganization(organization);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid || !isOrganizationValid) {
      return;
    }

    try {
      if (isOffline) {
        Alert.alert(
          'Offline Mode',
          'You need an internet connection to create an account. Please connect to the internet and try again.'
        );
        return;
      }

      await register({
        name,
        email,
        password,
        organization_name: organization,
      });
      
      // On successful registration, the user is automatically signed in and redirected
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle different error cases
      if (error.response && error.response.status === 409) {
        Alert.alert(
          'Registration Failed',
          'Email already exists. Please use a different email or try to sign in.'
        );
      } else {
        Alert.alert(
          'Registration Failed',
          'There was a problem creating your account. Please try again later.'
        );
      }
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
        </View>
        
        <View style={styles.formContainer}>
          <Text variant="headlineMedium" style={styles.formTitle}>
            Create Account
          </Text>
          
          {isOffline && (
            <View style={styles.offlineMessage}>
              <Ionicons name="cloud-offline" size={24} color="#F44336" />
              <Text style={styles.offlineText}>
                You are offline. Registration requires internet connection.
              </Text>
            </View>
          )}
          
          <TextInput
            label="Full Name"
            value={name}
            onChangeText={text => {
              setName(text);
              validateName(text);
            }}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
            error={!!nameError}
            left={<TextInput.Icon icon="account" />}
            disabled={isAuthenticating}
          />
          {nameError ? (
            <HelperText type="error" visible={!!nameError}>
              {nameError}
            </HelperText>
          ) : null}
          
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
              if (confirmPassword) {
                validateConfirmPassword(confirmPassword);
              }
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
          
          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={text => {
              setConfirmPassword(text);
              validateConfirmPassword(text);
            }}
            mode="outlined"
            style={styles.input}
            secureTextEntry={confirmSecureTextEntry}
            autoCapitalize="none"
            error={!!confirmPasswordError}
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={confirmSecureTextEntry ? 'eye' : 'eye-off'}
                onPress={() => setConfirmSecureTextEntry(!confirmSecureTextEntry)}
              />
            }
            disabled={isAuthenticating}
          />
          {confirmPasswordError ? (
            <HelperText type="error" visible={!!confirmPasswordError}>
              {confirmPasswordError}
            </HelperText>
          ) : null}
          
          <Divider style={styles.divider} />
          
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Organization Details
          </Text>
          
          <TextInput
            label="Organization Name"
            value={organization}
            onChangeText={text => {
              setOrganization(text);
              validateOrganization(text);
            }}
            mode="outlined"
            style={styles.input}
            autoCapitalize="words"
            error={!!organizationError}
            left={<TextInput.Icon icon="domain" />}
            disabled={isAuthenticating}
          />
          {organizationError ? (
            <HelperText type="error" visible={!!organizationError}>
              {organizationError}
            </HelperText>
          ) : null}
          
          <Button
            mode="contained"
            onPress={handleRegister}
            style={styles.registerButton}
            loading={isAuthenticating}
            disabled={isAuthenticating || isOffline}
          >
            Create Account
          </Button>
          
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </View>
        
        {!keyboardVisible && (
          <Animatable.View 
            style={styles.footer} 
            animation="fadeIn" 
            duration={500}
          >
            <Text style={styles.haveAccountText}>Already have an account?</Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
              disabled={isAuthenticating}
            >
              Log In
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
    marginTop: 24,
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  formTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
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
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  registerButton: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#DAB44A',
  },
  termsText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  linkText: {
    color: '#DAB44A',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    padding: 16,
  },
  haveAccountText: {
    marginBottom: 8,
    color: '#757575',
  },
  loginButton: {
    width: 200,
  },
});

export default RegisterScreen;
