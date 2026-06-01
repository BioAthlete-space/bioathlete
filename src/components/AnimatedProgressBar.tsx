import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { useTheme } from '../hooks/useThemeColor';

interface AnimatedProgressBarProps {
  current: number;
  max: number;
  color: string;
  delay?: number;
  height?: number;
}

export function AnimatedProgressBar({ current, max, color, delay = 0, height = 8 }: AnimatedProgressBarProps) {
  const theme = useTheme();
  const width = useSharedValue(0);

  useEffect(() => {
    const percentage = Math.min((current / max) * 100, 100);
    // Animation fluide du remplissage de la jauge
    width.value = withTiming(percentage, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [current, max]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${width.value}%`,
    };
  });

  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.surfaceSecondary, height }]}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: {
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
