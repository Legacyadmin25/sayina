import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import NotificationBanner from './NotificationBanner';
import pushNotificationService from '../../services/notifications/pushNotificationService';

/**
 * NotificationBannerController manages in-app notification banners
 * It listens for notifications from the PushNotificationService and displays them as banners
 */
const NotificationBannerController: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [duration, setDuration] = useState(4000);
  const [data, setData] = useState<any>(null);
  const [onPress, setOnPress] = useState<(() => void) | undefined>(undefined);
  
  const navigation = useNavigation();

  useEffect(() => {
    // Register for notification banner events from the service
    const removeListener = pushNotificationService.addBannerListener(options => {
      // Set banner properties
      setTitle(options.title);
      setMessage(options.message);
      setType(options.type as 'info' | 'success' | 'warning' | 'error' || 'info');
      setDuration(options.duration || 4000);
      
      // Handle navigation if onPress provided
      if (options.onPress) {
        setOnPress(() => options.onPress);
      } else if (options.data?.envelopeId) {
        // Default action for envelope notifications
        setOnPress(() => {
          // @ts-ignore - navigation type issues
          navigation.navigate('EnvelopeDetails', { envelopeId: options.data.envelopeId });
        });
        setData(options.data);
      } else {
        setOnPress(undefined);
        setData(null);
      }
      
      // Show banner
      setVisible(true);
    });
    
    return () => {
      // Clean up listener when component unmounts
      removeListener();
    };
  }, [navigation]);

  // Handle banner dismiss
  const handleDismiss = () => {
    setVisible(false);
    setData(null);
    setOnPress(undefined);
  };

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
      <NotificationBanner
        visible={visible}
        title={title}
        message={message}
        type={type}
        duration={duration}
        onDismiss={handleDismiss}
        onPress={onPress}
        data={data}
      />
    </View>
  );
};

export default NotificationBannerController;
