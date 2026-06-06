import React from 'react';
import { StyleSheet, Text, Pressable, PressableProps, ViewStyle, TextStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useThemeColor';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CustomButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: import('react-native').StyleProp<ViewStyle>;
  textStyle?: import('react-native').StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export function CustomButton({
  title,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  icon,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: CustomButtonProps) {
  const theme = useTheme();
  
  // Animation value for scale
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.96, { damping: 12, stiffness: 200 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
    if (onPressOut) onPressOut(e);
  };

  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) onPress(e);
  };

  const getBackgroundColor = () => {
    if (rest.disabled) return theme.border;
    
    switch (variant) {
      case 'primary': return theme.primary;
      case 'secondary': return theme.secondary;
      case 'danger': return theme.danger;
      case 'outline': return 'transparent';
      default: return theme.primary;
    }
  };

  const getTextColor = () => {
    if (rest.disabled) return theme.icon;
    if (variant === 'outline') return theme.primary;
    return '#1A1D24'; // Texte sombre sur boutons Néon
  };

  const getBorderColor = () => {
    if (variant === 'outline') return theme.primary;
    return 'transparent';
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: Layout.spacing.xs, paddingHorizontal: Layout.spacing.sm };
      case 'large': return { paddingVertical: Layout.spacing.md, paddingHorizontal: Layout.spacing.xl };
      case 'medium':
      default: return { paddingVertical: Layout.spacing.sm, paddingHorizontal: Layout.spacing.md };
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          opacity: rest.disabled ? 0.6 : 1,
        },
        animatedStyle,
        style,
      ]}
      {...rest}
    >
      {icon}
      <Text
        style={[
          styles.text,
          {
            color: getTextColor(),
            fontSize: size === 'small' ? Typography.sizes.sm : size === 'large' ? Typography.sizes.lg : Typography.sizes.md,
            marginLeft: icon ? Layout.spacing.sm : 0,
          },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.borderRadius.pill,
  },
  text: {
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase', // Très sport/perf
    textAlign: 'center',
  },
});
