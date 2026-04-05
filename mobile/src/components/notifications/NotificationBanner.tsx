import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface NotificationBannerProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  onDismiss: () => void;
  onPress?: () => void;
  data?: any;
}

const { width } = Dimensions.get('window');

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  visible,
  title,
  message,
  icon,
  type = 'info',
  duration = 4000,
  onDismiss,
  onPress,
  data,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeout = useRef<NodeJS.Timeout | null>(null);

  // Get color based on notification type
  const getTypeColor = () => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      case 'info':
      default:
        return '#DAB44A';
    }
  };

  // Get icon based on notification type or custom icon
  const getIcon = () => {
    if (icon) return icon;
    
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'warning':
        return 'alert-circle';
      case 'error':
        return 'close-circle';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  // Show notification animation
  const showNotification = () => {
    // Clear any existing timeout
    if (timeout.current) {
      clearTimeout(timeout.current);
    }
    
    // Start animations
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Set timeout to hide notification
    timeout.current = setTimeout(() => {
      hideNotification();
    }, duration);
  };

  // Hide notification animation
  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  // Handle press
  const handlePress = () => {
    hideNotification();
    
    if (onPress) {
      onPress();
    } else if (data) {
      // Default navigation behavior based on notification data
      if (data.type === 'envelope_to_sign' && data.envelopeId) {
        navigation.navigate('Signing', { envelopeId: data.envelopeId });
      } else if (data.type === 'envelope_completed' && data.envelopeId) {
        navigation.navigate('EnvelopeDetails', { envelopeId: data.envelopeId });
      }
    }
  };

  // Show or hide the notification when visibility changes
  useEffect(() => {
    if (visible) {
      showNotification();
    } else {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    }
    
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: getTypeColor(),
          paddingTop: insets.top > 0 ? insets.top : 10,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={getIcon() as any} size={24} color="#FFFFFF" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={hideNotification}
          hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
        >
          <Ionicons name="close" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
  closeButton: {
    padding: 4,
  },
});

export default NotificationBanner;
