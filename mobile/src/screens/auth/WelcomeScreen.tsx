import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: any;
}

const { width, height } = Dimensions.get('window');

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to Sayina',
    description: 'The secure and compliant way to sign documents, anywhere, anytime.',
    image: require('../../../assets/onboarding-1.png'),
  },
  {
    id: '2',
    title: 'Sign on the Go',
    description: 'Create, send, and sign documents from your mobile device with ease.',
    image: require('../../../assets/onboarding-2.png'),
  },
  {
    id: '3',
    title: 'Work Offline',
    description: 'Prepare documents even without an internet connection, they\'ll sync when you\'re back online.',
    image: require('../../../assets/onboarding-3.png'),
  },
];

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<any>(null);
  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;
  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  // Animated values for background elements
  const bgAnimation1 = useRef(new Animated.Value(0)).current;
  const bgAnimation2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate background elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnimation1, {
          toValue: 1,
          duration: 15000,
          useNativeDriver: true,
        }),
        Animated.timing(bgAnimation1, {
          toValue: 0,
          duration: 15000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgAnimation2, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        }),
        Animated.timing(bgAnimation2, {
          toValue: 0,
          duration: 20000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Interpolations for background elements
  const bgTranslateX1 = bgAnimation1.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });

  const bgTranslateY1 = bgAnimation1.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  const bgTranslateX2 = bgAnimation2.interpolate({
    inputRange: [0, 1],
    outputRange: [100, -100],
  });

  const bgTranslateY2 = bgAnimation2.interpolate({
    inputRange: [0, 1],
    outputRange: [50, -50],
  });

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    flatListRef.current?.scrollToIndex({
      index: slides.length - 1,
      animated: true,
    });
  };

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Animated background elements */}
      <Animated.View
        style={[
          styles.bgElement1,
          {
            transform: [
              { translateX: bgTranslateX1 },
              { translateY: bgTranslateY1 },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bgElement2,
          {
            transform: [
              { translateX: bgTranslateX2 },
              { translateY: bgTranslateY2 },
            ],
          },
        ]}
      />

      <View style={styles.header}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="headlineMedium" style={styles.appName}>
          Sayina
        </Text>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={({ item, index }) => (
          <View style={styles.slide}>
            <Animatable.Image
              animation="fadeIn"
              duration={1000}
              source={item.image}
              style={styles.slideImage}
              resizeMode="contain"
            />
            <Animatable.View
              animation="fadeInUp"
              duration={1000}
              delay={300}
            >
              <Text variant="headlineSmall" style={styles.slideTitle}>
                {item.title}
              </Text>
              <Text style={styles.slideDescription}>
                {item.description}
              </Text>
            </Animatable.View>
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
      />

      <View style={styles.paginationContainer}>
        <View style={styles.paginationDots}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 20, 10],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index.toString()}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity },
                  currentIndex === index ? styles.activeDot : {},
                ]}
              />
            );
          })}
        </View>

        <View style={styles.buttonContainer}>
          {currentIndex < slides.length - 1 ? (
            <>
              <TouchableOpacity onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
              <Button
                mode="contained"
                onPress={handleNext}
                style={styles.nextButton}
                labelStyle={styles.buttonLabel}
              >
                Next
              </Button>
            </>
          ) : (
            <Button
              mode="contained"
              onPress={handleGetStarted}
              style={[styles.nextButton, styles.getStartedButton]}
              labelStyle={styles.buttonLabel}
            >
              Get Started
            </Button>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  bgElement1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(218, 180, 74, 0.1)',
    top: -50,
    left: -50,
  },
  bgElement2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(218, 180, 74, 0.08)',
    bottom: -100,
    right: -100,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  appName: {
    fontWeight: 'bold',
    color: '#333333',
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  slideImage: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 30,
  },
  slideTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333333',
  },
  slideDescription: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 16,
    lineHeight: 24,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DAB44A',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#DAB44A',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#DAB44A',
    borderRadius: 30,
    paddingHorizontal: 20,
  },
  getStartedButton: {
    flex: 1,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WelcomeScreen;
