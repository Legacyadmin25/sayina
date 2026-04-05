import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import api from '../../services/api';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
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

  // Handle reset password request
  const handleResetPassword = async () => {
    if (!validateEmail(email)) {
      return;
    }

    if (isOffline) {
      Alert.alert(
        'Offline Mode',
        'You need an internet connection to reset your password. Please connect to the internet and try again.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post('/api/v1/auth/forgot-password', { email });
      setIsSuccess(true);
    } catch (error) {
      console.error('Reset password error:', error);
      
      // Always show success even if email doesn't exist for security reasons
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAwareScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333333" />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {isSuccess ? (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" style={styles.successIcon} />
            <Text variant="headlineSmall" style={styles.successTitle}>
              Check Your Email
            </Text>
            <Text style={styles.successText}>
              We've sent password reset instructions to:
            </Text>
            <Text style={styles.emailText}>{email}</Text>
            <Text style={styles.instructionText}>
              Please check your email inbox and follow the link to reset your password. The link will expire in 30 minutes.
            </Text>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Login')}
              style={styles.returnButton}
            >
              Return to Login
            </Button>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text variant="headlineSmall" style={styles.formTitle}>
              Forgot Password
            </Text>
            
            <Text style={styles.formDescription}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
            
            {isOffline && (
              <View style={styles.offlineMessage}>
                <Ionicons name="cloud-offline" size={24} color="#F44336" />
                <Text style={styles.offlineText}>
                  You are offline. Password reset requires internet connection.
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
              disabled={isSubmitting}
            />
            {emailError ? (
              <HelperText type="error" visible={!!emailError}>
                {emailError}
              </HelperText>
            ) : null}
            
            <Button
              mode="contained"
              onPress={handleResetPassword}
              style={styles.resetButton}
              loading={isSubmitting}
              disabled={isSubmitting || isOffline}
            >
              Send Reset Instructions
            </Button>
            
            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonLabel}
              disabled={isSubmitting}
            >
              Back to Login
            </Button>
          </View>
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
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 32,
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
  formDescription: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
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
    marginBottom: 16,
  },
  resetButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#DAB44A',
  },
  cancelButton: {
    marginBottom: 24,
  },
  cancelButtonLabel: {
    color: '#757575',
  },
  successContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#757575',
  },
  emailText: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 16,
  },
  instructionText: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
  },
  returnButton: {
    width: '80%',
  },
});

export default ForgotPasswordScreen;
