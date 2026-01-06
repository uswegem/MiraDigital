import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing, interpolate } from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface SplashScreenProps {
  navigation: any;
}

export function SplashScreen({ navigation }: SplashScreenProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.2, { duration: 1500, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
      -1,
      true
    );
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    const timer = setTimeout(() => {
      navigation.replace('PinLogin');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => {
    const scaleValue = interpolate(scale.value, [1, 1.2], [1, 1.5]);
    return {
      transform: [{ scale: scaleValue }],
    };
  });

  const animatedRotation = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.backgroundDark} />
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, animatedRotation]}>
          <Image
            source={require('../../assets/triangle.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Animated.View style={[styles.pulse, animatedStyle]} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
  },
  logo: {
    width: 80,
    height: 80,
    tintColor: colors.primary,
  },
  pulse: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    position: 'absolute',
  },
});

export default SplashScreen;
