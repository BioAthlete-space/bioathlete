import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useThemeColor';

interface ToastNotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
  onHide: () => void;
}

const BACKGROUND_COLORS: Record<ToastNotificationProps['type'], string | null> = {
  success: '#10B981',
  error: '#EF4444',
  info: null, // will use theme.primary
};

const AUTO_HIDE_DELAY_MS = 3000;

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  message,
  type,
  visible,
  onHide,
}) => {
  const theme = useTheme();

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onHide();
    }, AUTO_HIDE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [visible, onHide]);

  if (!visible) {
    return null;
  }

  const backgroundColor =
    BACKGROUND_COLORS[type] !== null ? BACKGROUND_COLORS[type]! : (theme.primary as string);

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutDown}
      style={[styles.container, { backgroundColor }]}
    >
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 9999,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
