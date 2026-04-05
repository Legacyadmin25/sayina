import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  isCircle?: boolean;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  isCircle = false,
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // Calculate dynamic border radius for circle
  const dynamicStyle: ViewStyle = {
    width,
    height,
    borderRadius: isCircle ? (typeof height === 'number' ? height / 2 : 999) : borderRadius,
  };

  useEffect(() => {
    // Start shimmer animation when component mounts
    const shimmerAnimation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.ease,
        useNativeDriver: false, // We can't use native driver for backgroundColor
      })
    );
    
    shimmerAnimation.start();
    
    // Clean up animation on unmount
    return () => {
      shimmerAnimation.stop();
    };
  }, [animatedValue]);

  // Interpolate animated value to create shimmer effect
  const shimmerColors = animatedValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      colors.backdrop,
      colors.surfaceVariant,
      colors.backdrop,
    ],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        dynamicStyle,
        { backgroundColor: shimmerColors },
        style,
      ]}
    />
  );
};

interface SkeletonContentProps {
  isLoading: boolean;
  containerStyle?: ViewStyle;
  layout?: SkeletonLoaderProps[];
  children: React.ReactNode;
}

export const SkeletonContent: React.FC<SkeletonContentProps> = ({
  isLoading,
  containerStyle,
  layout = [],
  children,
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {layout.map((item, index) => (
        <SkeletonLoader
          key={`skeleton-${index}`}
          width={item.width}
          height={item.height}
          borderRadius={item.borderRadius}
          style={item.style}
          isCircle={item.isCircle}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  skeleton: {
    marginVertical: 8,
  },
});

export default SkeletonLoader;
