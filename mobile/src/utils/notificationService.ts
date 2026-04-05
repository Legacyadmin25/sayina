import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Notification Service handles both push notifications and local in-app notifications
 */
class NotificationService {
  /**
   * Register for push notifications
   */
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications are not available in the simulator');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only ask for permission if not determined yet
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // If permission was not granted, return null
      if (finalStatus !== 'granted') {
        console.log('Permission for push notifications was denied');
        return null;
      }

      // Get the token
      const expoPushToken = await this.getExpoPushToken();
      return expoPushToken;

    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Get the Expo push token
   */
  async getExpoPushToken() {
    try {
      // Check if we are on a physical device
      if (!Device.isDevice) {
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants?.expoConfig?.extra?.eas?.projectId,
      });
      
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Send a local notification
   */
  async sendLocalNotification({ title, body, data = {} }: NotificationData) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // null means show immediately
      });
      return true;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return false;
    }
  }

  /**
   * Show in-app banner notification when app is in foreground
   * This is a custom UI component that appears at the top of the screen
   */
  showInAppNotification(notification: NotificationData) {
    // We'll call this method from our NotificationContext to show a custom UI banner
    // The actual UI will be rendered by the NotificationContext
    const event = new CustomEvent('inAppNotification', { detail: notification });
    // @ts-ignore - document may not be available in React Native
    if (typeof document !== 'undefined') {
      document.dispatchEvent(event);
    }
    return true;
  }

  /**
   * Send envelope completed notification
   */
  async sendEnvelopeCompletedNotification(envelopeTitle: string, envelopeId: string) {
    // First check if app is in foreground
    const appState = await Notifications.getDevicePushTokenAsync();
    const isForegrounded = appState !== null;

    const notification: NotificationData = {
      title: 'Envelope Completed',
      body: `The envelope "${envelopeTitle}" has been completed by all signers.`,
      data: {
        type: 'envelope_completed',
        envelopeId,
      },
    };

    if (isForegrounded) {
      // If app is in foreground, show in-app notification
      this.showInAppNotification(notification);
    } else {
      // Otherwise send a local notification
      await this.sendLocalNotification(notification);
    }
  }

  /**
   * Send signature requested notification
   */
  async sendSignatureRequestedNotification(envelopeTitle: string, envelopeId: string) {
    const notification: NotificationData = {
      title: 'Signature Requested',
      body: `You've been requested to sign "${envelopeTitle}".`,
      data: {
        type: 'signature_requested',
        envelopeId,
      },
    };

    // First check if app is in foreground
    const appState = await Notifications.getDevicePushTokenAsync();
    const isForegrounded = appState !== null;

    if (isForegrounded) {
      // If app is in foreground, show in-app notification
      this.showInAppNotification(notification);
    } else {
      // Otherwise send a local notification
      await this.sendLocalNotification(notification);
    }
  }
}

// Export a singleton instance
export default new NotificationService();
