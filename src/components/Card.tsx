import React from 'react';
import { StyleSheet, ViewProps, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '../hooks/useThemeColor';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps extends ViewProps {
  title?: string;
  children: React.ReactNode;
  elevation?: 'none' | 'light' | 'medium';
  onPress?: () => void;
}

export function Card({ title, children, elevation = 'none', onPress, style, ...rest }: CardProps) {
  const theme = useTheme();
  
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
  };

  const CardContent = (
    <>
      {title && (
        <Text style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
      )}
      {children}
    </>
  );

  const cardStyles = [
    styles.card,
    {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1, // Toujours 1px pour le style Bento Box propre
    },
    elevation === 'light' && Layout.shadows.light,
    elevation === 'medium' && Layout.shadows.medium,
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[...cardStyles, animatedStyle]}
        {...rest}
      >
        {CardContent}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={cardStyles} {...rest}>
      {CardContent}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.borderRadius.xl, // Style Bento Box hyper arrondi
    padding: Layout.spacing.lg,
    marginVertical: Layout.spacing.sm,
    overflow: 'hidden',
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Layout.spacing.md,
  },
});
