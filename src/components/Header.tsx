import React from 'react';
import { StyleSheet, View, Text, ViewProps, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

interface HeaderProps extends ViewProps {
  title?: string;
  titleComponent?: React.ReactNode;
  showBack?: boolean;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  onPressTitle?: () => void;
}

export function Header({ title, titleComponent, leftContent, rightContent, onPressTitle, style, ...rest }: HeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + Layout.spacing.sm,
        },
        style,
      ]}
      {...rest}
    >
      <View style={styles.inner}>
        <View style={styles.center} pointerEvents="box-none">
          {titleComponent ? (
            onPressTitle ? (
              <TouchableOpacity onPress={onPressTitle} style={{ flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
                {titleComponent}
                <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.text} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ) : (
              titleComponent
            )
          ) : (title && (
            onPressTitle ? (
              <TouchableOpacity onPress={onPressTitle} style={{ flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7}>
                <Text style={[styles.title, { color: theme.text, marginRight: 4 }]} numberOfLines={1}>
                  {title}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.text} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {title}
              </Text>
            )
          ))}
        </View>
        
        <View style={styles.left}>
          {leftContent}
        </View>
        <View style={styles.right}>
          {rightContent}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    position: 'relative',
    minHeight: 32, // Guarantee a minimum height if no left/right content
  },
  left: {
    zIndex: 1,
    alignItems: 'flex-start',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  right: {
    zIndex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
});
