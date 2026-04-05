import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import InAppNotification from '../components/notifications/InAppNotification';
import notificationService from '../utils/notificationService';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  data?: any;
}

interface NotificationContextData {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: () => void;
  notifications: Notification[];
  isNotificationsEnabled: boolean;
  toggleNotifications: (enabled: boolean) => Promise<void>;
  isPushSupported: boolean;
  hasPermissions: boolean;
  requestPermissions: () => Promise<boolean>;
  sendEnvelopeCompletedNotification: (envelopeTitle: string, envelopeId: string) => Promise<void>;
  sendSignatureRequestedNotification: (envelopeTitle: string, envelopeId: string) => Promise<void>;
  pushToken: string | null;
}

const NotificationContext = createContext<NotificationContextData>({} as NotificationContextData);

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const { user } = useAuth();
  const notificationListenerRef = useRef<any>(null);

  // Initialize push notification service
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Check if notifications are supported
        const isSupported = Device.isDevice;
        setIsPushSupported(isSupported);

        // Register for push notifications
        if (isSupported && isNotificationsEnabled) {
          // Check if permissions are granted
          const { status } = await Notifications.getPermissionsAsync();
          setHasPermissions(status === 'granted');
          
          if (status === 'granted') {
            // Get push token
            const token = await notificationService.getExpoPushToken();
            setPushToken(token);
            
            // Save token to user profile if we have a user
            if (token && user?.id) {
              // TODO: Save token to backend
              console.log('Push token registered:', token);
            }
          }
        }
        
        // Set up notification listeners for foreground notifications
        notificationListenerRef.current = Notifications.addNotificationReceivedListener(handleNotificationReceived);
        
        // Set up custom event listener for in-app notifications
        const handleInAppNotification = (event: any) => {
          if (event.detail) {
            const { title, body, data } = event.detail;
            showNotification({
              title: title || 'New Notification',
              message: body || '',
              type: (data?.type === 'envelope_completed' ? 'success' : 'info') as any,
              data: data || {},
            });
          }
        };
        
        // @ts-ignore - document may not be available in React Native
        if (typeof document !== 'undefined') {
          document.addEventListener('inAppNotification', handleInAppNotification);
        }
        
        return () => {
          if (notificationListenerRef.current) {
            notificationListenerRef.current.remove();
          }
          // @ts-ignore - document may not be available in React Native
          if (typeof document !== 'undefined') {
            document.removeEventListener('inAppNotification', handleInAppNotification);
          }
        };
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initNotifications();
  }, [isNotificationsEnabled, user?.id]);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected !== false);
    });

    return () => unsubscribe();
  }, []);

  // Handle received notifications
  const handleNotificationReceived = (notification: Notifications.Notification) => {
    const { title, body, data } = notification.request.content;
    
    // Add to notifications list
    const newNotification: Notification = {
      id: notification.request.identifier,
      title: title || 'New Notification',
      message: body || '',
      type: (data?.type as any) || 'info',
      icon: data?.icon as string,
      data: data || {},
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show banner for foreground notifications
    showNotification(newNotification);
  };

  // Request notification permissions
  const requestPermissions = async (): Promise<boolean> => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setHasPermissions(granted);
      
      if (granted) {
        // Get push token
        const token = await notificationService.getExpoPushToken();
        setPushToken(token);
        
        // Save token to user profile if we have a user
        if (token && user?.id) {
          // TODO: Save token to backend
          console.log('Push token registered:', token);
        }
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  // Toggle notifications
  const toggleNotifications = async (enabled: boolean): Promise<void> => {
    try {
      // Save to AsyncStorage or SecureStore in a real implementation
      setIsNotificationsEnabled(enabled);
      
      if (enabled && !hasPermissions) {
        await requestPermissions();
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    }
  };
  
  // Send envelope completed notification
  const sendEnvelopeCompletedNotification = async (envelopeTitle: string, envelopeId: string): Promise<void> => {
    try {
      await notificationService.sendEnvelopeCompletedNotification(envelopeTitle, envelopeId);
    } catch (error) {
      console.error('Error sending envelope completed notification:', error);
    }
  };
  
  // Send signature requested notification
  const sendSignatureRequestedNotification = async (envelopeTitle: string, envelopeId: string): Promise<void> => {
    try {
      await notificationService.sendSignatureRequestedNotification(envelopeTitle, envelopeId);
    } catch (error) {
      console.error('Error sending signature requested notification:', error);
    }
  };

  // Show notification banner
  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = notification.id || Date.now().toString();
    const newNotification: Notification = { ...notification, id };
    
    setCurrentNotification(newNotification);
    setShowBanner(true);
  };

  // Dismiss notification banner
  const dismissNotification = () => {
    setShowBanner(false);
    setCurrentNotification(null);
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        dismissNotification,
        notifications,
        isNotificationsEnabled,
        toggleNotifications,
        isPushSupported,
        hasPermissions,
        requestPermissions,
        sendEnvelopeCompletedNotification,
        sendSignatureRequestedNotification,
        pushToken,
      }}
    >
      {children}
      
      {/* In-app notification banner */}
      {currentNotification && (
        <InAppNotification
          title={currentNotification.title}
          message={currentNotification.message}
          type={currentNotification.type}
          onDismiss={dismissNotification}
          data={currentNotification.data}
        />
      )}
    </NotificationContext.Provider>
  );
};
