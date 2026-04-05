import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { Text, List, Switch, Divider, Button, Dialog, Portal, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as Application from 'expo-application';
import { useAuth } from '../../contexts/AuthContext';
import { useBiometricAuth } from '../../contexts/BiometricAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSelector from '../../components/settings/LanguageSelector';

// Settings keys
const SETTINGS_KEYS = {
  DARK_MODE: 'settings:darkMode',
  NOTIFICATIONS: 'settings:notifications',
  OFFLINE_MODE: 'settings:offlineMode',
  AUTO_SYNC: 'settings:autoSync',
  CACHE_DOCUMENTS: 'settings:cacheDocuments',
  LANGUAGE: 'settings:language',
};

const SettingsScreen = () => {
  // Settings state
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [cacheDocuments, setCacheDocuments] = useState(true);
  
  // Dialog state
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  // App info
  const [appVersion, setAppVersion] = useState('');
  const [cacheSize, setCacheSize] = useState('0 MB');
  
  // Network status
  const [isOffline, setIsOffline] = useState(false);
  
  // Context hooks
  const { signOut } = useAuth();
  const { isBiometricEnabled, enableBiometricAuth, disableBiometricAuth } = useBiometricAuth();
  const { currentLanguage, changeLanguage, t, supportedLanguages } = useLanguage();

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    getAppVersion();
    calculateCacheSize();
    
    // Monitor network status
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    
    return () => unsubscribe();
  }, []);

  // Load saved settings from AsyncStorage
  const loadSettings = async () => {
    try {
      const keys = Object.values(SETTINGS_KEYS);
      const results = await AsyncStorage.multiGet(keys);
      
      results.forEach(([key, value]) => {
        if (value !== null) {
          switch (key) {
            case SETTINGS_KEYS.DARK_MODE:
              setDarkMode(value === 'true');
              break;
            case SETTINGS_KEYS.NOTIFICATIONS:
              setNotifications(value === 'true');
              break;
            case SETTINGS_KEYS.OFFLINE_MODE:
              setOfflineMode(value === 'true');
              break;
            case SETTINGS_KEYS.AUTO_SYNC:
              setAutoSync(value === 'true');
              break;
            case SETTINGS_KEYS.CACHE_DOCUMENTS:
              setCacheDocuments(value === 'true');
              break;
          }
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Save a setting to AsyncStorage
  const saveSetting = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, String(value));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  // Get app version
  const getAppVersion = async () => {
    try {
      const version = await Application.nativeApplicationVersion;
      const buildNumber = await Application.nativeBuildVersion;
      setAppVersion(`${version} (${buildNumber})`);
    } catch (error) {
      console.error('Error getting app version:', error);
      setAppVersion('Unknown');
    }
  };

  // Calculate cache size
  const calculateCacheSize = async () => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(FileSystem.cacheDirectory!);
      if (fileInfo.exists && fileInfo.isDirectory) {
        const size = fileInfo.size || 0;
        const sizeInMB = (size / (1024 * 1024)).toFixed(2);
        setCacheSize(`${sizeInMB} MB`);
      }
    } catch (error) {
      console.error('Error calculating cache size:', error);
    }
  };

  // Clear cache
  const clearCache = async () => {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      const documentDir = FileSystem.documentDirectory;
      
      if (cacheDir) {
        // Get all files in cache directory
        const files = await FileSystem.readDirectoryAsync(cacheDir);
        
        // Delete each file
        for (const file of files) {
          await FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true });
        }
      }
      
      // Clear document directory PDF files if any
      if (documentDir) {
        try {
          const files = await FileSystem.readDirectoryAsync(documentDir);
          for (const file of files) {
            if (file.endsWith('.pdf')) {
              await FileSystem.deleteAsync(`${documentDir}${file}`, { idempotent: true });
            }
          }
        } catch (error) {
          console.error('Error clearing documents:', error);
        }
      }
      
      // Clear AsyncStorage items related to cache
      await AsyncStorage.removeItem('documentCache');
      
      // Update cache size
      calculateCacheSize();
      
      Alert.alert('Success', 'Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache');
    } finally {
      setShowClearCacheDialog(false);
    }
  };

  // Toggle dark mode
  const handleToggleDarkMode = (value: boolean) => {
    setDarkMode(value);
    saveSetting(SETTINGS_KEYS.DARK_MODE, value);
    // Implementation for applying theme would go here
  };

  // Toggle notifications
  const handleToggleNotifications = (value: boolean) => {
    setNotifications(value);
    saveSetting(SETTINGS_KEYS.NOTIFICATIONS, value);
    // Implementation for enabling/disabling notifications would go here
  };

  // Toggle offline mode
  const handleToggleOfflineMode = (value: boolean) => {
    setOfflineMode(value);
    saveSetting(SETTINGS_KEYS.OFFLINE_MODE, value);
  };

  // Toggle auto sync
  const handleToggleAutoSync = (value: boolean) => {
    setAutoSync(value);
    saveSetting(SETTINGS_KEYS.AUTO_SYNC, value);
  };

  // Toggle cache documents
  const handleToggleCacheDocuments = (value: boolean) => {
    setCacheDocuments(value);
    saveSetting(SETTINGS_KEYS.CACHE_DOCUMENTS, value);
  };

  // Set language
  const handleSetLanguage = (value: string) => {
    changeLanguage(value);
    saveSetting(SETTINGS_KEYS.LANGUAGE, value);
    setShowLanguageDialog(false);
  };

  // Toggle biometric authentication
  const handleToggleBiometric = async (value: boolean) => {
    try {
      if (value) {
        const success = await enableBiometricAuth();
        if (!success) {
          Alert.alert(
            'Biometric Setup Failed',
            'Failed to enable biometric authentication. Please try again.'
          );
        }
      } else {
        await disableBiometricAuth();
      }
    } catch (error) {
      console.error('Error toggling biometric auth:', error);
    }
  };

  // Open URL
  const openUrl = (url: string) => {
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.error('Cannot open URL:', url);
      }
    });
  };

  // Get language display name
  const getLanguageDisplayName = (languageCode: string) => {
    const language = supportedLanguages.find(lang => lang.code === languageCode);
    return language ? language.name : 'English';
  };

  // Handle logout
  const handleLogout = () => {
    setShowLogoutDialog(false);
    signOut();
  };

  // Handle language dialog close
  const handleLanguageDialogClose = () => {
    setShowLanguageDialog(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Language Selection Dialog */}
      <Portal>
        <Dialog visible={showLanguageDialog} onDismiss={handleLanguageDialogClose}>
          <Dialog.Title>{t('select_language')}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={handleSetLanguage} value={currentLanguage}>
              {supportedLanguages.map((language) => (
                <RadioButton.Item
                  key={language.code}
                  label={`${language.name} (${language.nativeName})`}
                  value={language.code}
                  style={styles.languageOption}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleLanguageDialogClose}>{t('cancel')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Clear Cache Confirmation Dialog */}
      <Portal>
        <Dialog visible={showClearCacheDialog} onDismiss={() => setShowClearCacheDialog(false)}>
          <Dialog.Title>{t('clear_cache')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('clear_cache_confirmation')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearCacheDialog(false)}>{t('cancel')}</Button>
            <Button onPress={clearCache}>{t('clear')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>{t('logout')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('logout_confirmation')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>{t('cancel')}</Button>
            <Button onPress={handleLogout}>{t('logout')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium">{t('settings')}</Text>
          {isOffline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline-outline" size={18} color="#FFFFFF" />
              <Text style={styles.offlineText}>{t('offline_mode')}</Text>
            </View>
          )}
        </View>
        
        {/* Appearance */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>{t('appearance')}</List.Subheader>
          
          <List.Item
            title={t('dark_mode')}
            description={t('dark_mode_description')}
            left={props => <List.Icon {...props} icon="moon" />}
            right={props => (
              <Switch
                value={darkMode}
                onValueChange={handleToggleDarkMode}
                color="#DAB44A"
              />
            )}
          />
          
          <List.Item
            title={t('language')}
            description={getLanguageDisplayName(currentLanguage)}
            left={props => <List.Icon {...props} icon="translate" />}
            onPress={() => setShowLanguageDialog(true)}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>
        
        <Divider />
        
        {/* Notifications */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>{t('notifications')}</List.Subheader>
          
          <List.Item
            title={t('notifications')}
            description={t('enable_notifications')}
            left={props => <List.Icon {...props} icon="bell" />}
            right={props => (
              <Switch
                value={notifications}
                onValueChange={handleToggleNotifications}
                color="#DAB44A"
              />
            )}
          />
        </List.Section>
        
        <Divider />
        
        {/* Data & Storage */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>{t('data_storage')}</List.Subheader>
          
          <List.Item
            title={t('offline_mode')}
            description={t('offline_mode_description')}
            left={props => <List.Icon {...props} icon="wifi-off" />}
            right={props => (
              <Switch
                value={offlineMode}
                onValueChange={handleToggleOfflineMode}
                color="#DAB44A"
              />
            )}
          />
          
          <List.Item
            title={t('auto_sync')}
            description={t('auto_sync_description')}
            left={props => <List.Icon {...props} icon="sync" />}
            right={props => (
              <Switch
                value={autoSync}
                onValueChange={handleToggleAutoSync}
                disabled={!offlineMode}
                color="#DAB44A"
              />
            )}
          />
          
          <List.Item
            title={t('cache_documents')}
            description={t('cache_documents_description')}
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => (
              <Switch
                value={cacheDocuments}
                onValueChange={handleToggleCacheDocuments}
                disabled={!offlineMode}
                color="#DAB44A"
              />
            )}
          />
          
          <List.Item
            title={t('clear_cache')}
            description={`Current cache size: ${cacheSize}`}
            left={props => <List.Icon {...props} icon="cached" />}
            onPress={() => setShowClearCacheDialog(true)}
          />
        </List.Section>
        
        <Divider />
        
        {/* Security */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>{t('security')}</List.Subheader>
          
          <List.Item
            title={t('biometric_authentication')}
            description={isBiometricEnabled ? t('enabled') : t('disabled')}
            left={props => <List.Icon {...props} icon="fingerprint" />}
            right={props => (
              <Switch
                value={isBiometricEnabled}
                onValueChange={handleToggleBiometric}
                color="#DAB44A"
              />
            )}
          />
        </List.Section>
        
        <Divider />
        
        {/* About */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>{t('about')}</List.Subheader>
          
          <List.Item
            title={t('privacy_policy')}
            description={t('privacy_policy_description')}
            left={props => <List.Icon {...props} icon="shield" />}
            onPress={() => openUrl('https://sayina.co.za/privacy-policy')}
          />
          
          <List.Item
            title={t('terms_of_service')}
            description={t('terms_of_service_description')}
            left={props => <List.Icon {...props} icon="document-text" />}
            onPress={() => openUrl('https://sayina.co.za/terms-of-service')}
          />
          
          <List.Item
            title={t('contact_us')}
            description={t('contact_us_description')}
            left={props => <List.Icon {...props} icon="help-circle" />}
            onPress={() => openUrl('mailto:support@sayina.co.za')}
          />
          
          <List.Item
            title={t('version')}
            description={appVersion}
            left={props => <List.Icon {...props} icon="information-circle" />}
          />
        </List.Section>
        
        <Divider />
        
        {/* Account */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>{t('account')}</List.Subheader>
          
          <List.Item
            title={t('sign_out')}
            titleStyle={{ color: '#F44336' }}
            left={props => <List.Icon {...props} icon="logout" color="#F44336" />}
            onPress={() => setShowLogoutDialog(true)}
          />
        </List.Section>
      </ScrollView>
      
      {/* Clear Cache Dialog */}
      <Portal>
        <Dialog visible={showClearCacheDialog} onDismiss={() => setShowClearCacheDialog(false)}>
          <Dialog.Title>{t('clear_cache')}</Dialog.Title>
          <Dialog.Content>
            <Text>{t('cache_cleared')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearCacheDialog(false)}>{t('cancel')}</Button>
            <Button onPress={clearCache}>{t('clear')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Language Selector */}
      <LanguageSelector
        isVisible={showLanguageDialog}
        onClose={handleLanguageDialogClose}
        onLanguageChange={handleSetLanguage}
      />
              </View>
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLanguageDialog(false)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Logout Dialog */}
      <Portal>
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Log Out</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to log out of your account?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button onPress={handleLogout} textColor="#F44336">Log Out</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    margin: 16,
    borderRadius: 4,
  },
  offlineText: {
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
    fontSize: 12,
  },
  sectionHeader: {
    fontWeight: 'bold',
    color: '#DAB44A',
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  languageOption: {
    paddingVertical: 4,
  },
  version: {
    textAlign: 'center',
    marginTop: 8,
    color: '#888',
  },
});

export default SettingsScreen;
