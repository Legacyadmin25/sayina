import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, RouteProp, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from 'react-native-paper';
import { RootStackParamList } from '../../navigation';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';

type InvalidDeepLinkScreenRouteProp = RouteProp<RootStackParamList, 'InvalidDeepLink'>;

/**
 * InvalidDeepLinkScreen displays an error message when a deep link is invalid or expired
 * It provides options to go to the home screen or login
 */
const InvalidDeepLinkScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<InvalidDeepLinkScreenRouteProp>();
  const { isAuthenticated } = useAuth();
  
  const { error, originalUrl } = route.params || { 
    error: t('invalid_link_generic', 'This link appears to be invalid or has expired'),
    originalUrl: undefined
  };

  const handleGoHome = () => {
    if (isAuthenticated) {
      navigation.navigate('Main');
    } else {
      navigation.navigate('Auth');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../../assets/error-icon.png')}
          style={styles.image}
          resizeMode="contain"
        />
        
        <Text style={styles.title}>{t('invalid_link_title', 'Link Error')}</Text>
        
        <Text style={styles.message}>{error}</Text>
        
        {originalUrl && (
          <View style={styles.urlContainer}>
            <Text style={styles.urlLabel}>{t('requested_url', 'Requested URL:')}</Text>
            <Text style={styles.url} numberOfLines={2}>{originalUrl}</Text>
          </View>
        )}
        
        <View style={styles.actions}>
          <Button 
            mode="contained" 
            onPress={handleGoHome}
            style={styles.button}
          >
            {isAuthenticated 
              ? t('go_to_dashboard', 'Go to Dashboard') 
              : t('go_to_login', 'Go to Login')}
          </Button>
          
          <Pressable 
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Text style={styles.backButtonText}>
              {t('go_back', 'Go Back')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  image: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  urlContainer: {
    backgroundColor: '#EEEEEE',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    marginBottom: 32,
  },
  urlLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 4,
  },
  url: {
    fontSize: 14,
    color: '#888888',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#DAB44A',
  },
  backButton: {
    padding: 12,
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    color: '#666666',
    fontSize: 16,
  },
});

export default InvalidDeepLinkScreen;
