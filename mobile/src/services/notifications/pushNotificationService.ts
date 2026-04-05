import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api';

// Storage keys
const NOTIFICATION_TOKEN_KEY = 'pushNotificationToken';
const NOTIFICATION_ENABLED_KEY = 'pushNotificationEnabled';

// Configure default notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationBannerOptions {
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  onPress?: () => void;
}

// Event emitter for in-app notifications
type NotificationEventListener = (options: NotificationBannerOptions) => void;

class PushNotificationService {
  private expoPushToken: string | undefined;
  private notificationListener: any;
  private responseListener: any;
  private isRegistered: boolean = false;
  private bannerListeners: NotificationEventListener[] = [];

  /**
   * Initialize push notifications
   */
  async initialize() {
    // Check if notifications are enabled by the user
    const enabled = await this.isNotificationsEnabled();
    if (!enabled) {
      console.log('Push notifications are disabled by user preference');
      return;
    }

    if (!Device.isDevice) {
      console.log('Push notifications are not available on simulator/emulator');
      return;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      await this.setNotificationsEnabled(false);
      return;
    }

    try {
      // Get the token
      const expoPushToken = await this.getExpoToken();
      this.expoPushToken = expoPushToken;
      
      // Register the token with our backend
      await this.registerTokenWithBackend(expoPushToken);
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      this.isRegistered = true;
      console.log('Push notification service initialized successfully');
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }

  /**
   * Clean up notification listeners
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Get the Expo push token
   */
  private async getExpoToken(): Promise<string> {
    // Check if we have a stored token
    const storedToken = await AsyncStorage.getItem(NOTIFICATION_TOKEN_KEY);
    if (storedToken) {
      return storedToken;
    }

    // Otherwise get a new token
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#DAB44A',
      });
    }

    // Project ID is required for Expo's push notification service
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    token = tokenData.data;
    
    // Store the token for future use
    await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
    
    return token;
  }

  /**
   * Register the token with our backend
   */
  private async registerTokenWithBackend(token: string) {
    try {
      const deviceInfo = {
        token,
        device_type: Platform.OS,
        device_name: Device.deviceName || 'Unknown Device',
        device_model: Device.modelName || 'Unknown Model',
      };
      
      await api.post('/api/v1/notifications/register-device', deviceInfo);
      console.log('Device registered for push notifications');
    } catch (error) {
      console.error('Error registering device for push notifications:', error);
      throw error;
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners() {
    // This listener is fired whenever a notification is received while the app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      // We can handle foreground notifications differently if needed
    });

    // This listener is fired whenever a user taps on or interacts with a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      
      // Handle notification tap based on notification type
      const data = response.notification.request.content.data;
      this.handleNotificationTap(data);
    });
  }

  /**
   * Handle when user taps on a notification
   */
  private handleNotificationTap(data: any) {
    // We'll implement deep linking based on notification type
    // For example, navigating to the appropriate screen when a notification is tapped
    if (data.type === 'envelope_to_sign') {
      // Navigate to signing screen
      // This will be implemented in the NavigationService
      console.log('Navigate to signing screen for envelope:', data.envelopeId);
    } else if (data.type === 'envelope_completed') {
      // Navigate to envelope details
      console.log('Navigate to envelope details screen for envelope:', data.envelopeId);
    }
  }

  /**
   * Check if notifications are enabled in user preferences
   */
  async isNotificationsEnabled(): Promise<boolean> {
    const enabled = await AsyncStorage.getItem(NOTIFICATION_ENABLED_KEY);
    // Default to true if not set
    return enabled !== 'false';
  }

  /**
   * Set whether notifications are enabled in user preferences
   */
  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(NOTIFICATION_ENABLED_KEY, String(enabled));
    
    // If enabling and we're not already registered, initialize
    if (enabled && !this.isRegistered) {
      await this.initialize();
    }
  }

  /**
   * Schedule a local notification for testing
   */
  async scheduleLocalNotification(title: string, body: string, data: any = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: { seconds: 2 },
    });
  }

  /**
   * Get the last notification that the app received
   */
  async getLastNotificationResponse() {
    const response = await Notifications.getLastNotificationResponseAsync();
    return response;
  }

  /**
   * Send an envelope completed notification
   * @param envelopeId The ID of the completed envelope
   * @param envelopeName The name of the completed envelope
   * @param signerName The name of the signer who completed the envelope
   */
  async sendEnvelopeCompletedNotification(envelopeId: string, envelopeName: string, signerName?: string) {
    // Only proceed if notifications are enabled
    const enabled = await this.isNotificationsEnabled();
    if (!enabled) {
      console.log('Push notifications are disabled by user preference');
      return;
    }

    try {
      // Create notification content
      const title = 'Envelope Completed';
      const body = signerName 
        ? `${signerName} has completed the envelope "${envelopeName}"`
        : `Envelope "${envelopeName}" has been completed`;
      
      // If app is in foreground, show a banner instead of a system notification
      if (AppState.currentState === 'active') {
        this.showInAppBanner({
          title,
          message: body,
          type: 'success',
          duration: 5000,
          onPress: () => {
            // Navigate to envelope details (handled by listener)
          }
        });
      } else {
        // Send a local notification if app is in background
        await this.scheduleLocalNotification(title, body, {
          type: 'envelope_completed',
          envelopeId,
          envelopeName
        });
      }

      // Also send the event to the server for tracking
      try {
        await api.post('/api/v1/envelopes/track-notification', {
          envelopeId,
          type: 'completed',
          delivered: true
        });
      } catch (serverError) {
        console.error('Failed to track notification on server:', serverError);
        // Don't stop execution if server tracking fails
      }
    } catch (error) {
      console.error('Error sending envelope completed notification:', error);
    }
  }

  /**
   * Add a listener for in-app notification banners
   * @param listener The function to call when a notification banner should be shown
   * @returns A function to remove the listener
   */
  addBannerListener(listener: NotificationEventListener): () => void {
    this.bannerListeners.push(listener);
    
    // Return a function to remove the listener
    return () => {
      this.bannerListeners = this.bannerListeners.filter(l => l !== listener);
    };
  }

  /**
   * Show an in-app notification banner
   * @param options Banner options including title, message, type, duration, and onPress handler
   */
  private showInAppBanner(options: NotificationBannerOptions): void {
    // Notify all listeners
    this.bannerListeners.forEach(listener => listener(options));
  }
}

export default new PushNotificationService();
