import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

interface InAppNotificationProps {
  title: string;
  message: string;
  duration?: number;
  type?: 'success' | 'error' | 'info' | 'warning';
  onPress?: () => void;
  onDismiss?: () => void;
  data?: Record<string, any>;
}

/**
 * In-app notification banner that slides down from the top of the screen
 */
const InAppNotification: React.FC<InAppNotificationProps> = ({
  title,
  message,
  duration = 5000,
  type = 'info',
  onPress,
  onDismiss,
  data,
}) => {
  const [visible, setVisible] = useState(true);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Slide in animation
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

    // Auto dismiss after duration
    timeout.current = setTimeout(() => {
      dismiss();
    }, duration);

    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  const dismiss = () => {
    // Slide out animation
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    });
  };

  const handlePress = () => {
    dismiss();
    
    if (onPress) {
      onPress();
    } else if (data?.type === 'envelope_completed' && data?.envelopeId) {
      // Navigate to envelope details on notification press
      // @ts-ignore - we know this route exists
      navigation.navigate('EnvelopeDetails', { envelopeId: data.envelopeId });
    } else if (data?.type === 'signature_requested' && data?.envelopeId) {
      // Navigate to signing screen on notification press
      // @ts-ignore - we know this route exists
      navigation.navigate('Signing', { envelopeId: data.envelopeId });
    }
  };

  if (!visible) {
    return null;
  }

  // Choose icon and color based on notification type
  let icon;
  let backgroundColor: ViewStyle['backgroundColor'];

  switch (type) {
    case 'success':
      icon = 'checkmark-circle';
      backgroundColor = '#4CAF50';
      break;
    case 'error':
      icon = 'alert-circle';
      backgroundColor = '#F44336';
      break;
    case 'warning':
      icon = 'warning';
      backgroundColor = '#FF9800';
      break;
    case 'info':
    default:
      icon = 'information-circle';
      backgroundColor = '#2196F3';
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          marginTop: insets.top,
          backgroundColor,
        },
      ]}
    >
      <TouchableOpacity style={styles.touchable} onPress={handlePress}>
        <View style={styles.content}>
          <Ionicons name={icon} size={24} color="white" style={styles.icon} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message} numberOfLines={2}>
              {message}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>
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
    zIndex: 999,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  touchable: {
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    color: 'white',
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
});

export default InAppNotification;
