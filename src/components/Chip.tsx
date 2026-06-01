import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useThemeColor';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';

interface ChipProps {
  label: string;
  isSelected?: boolean;
  isPrimary?: boolean;
  onPress: () => void;
}

export function Chip({ label, isSelected = false, isPrimary = false, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: theme.surfaceSecondary }, // Default unselected
        isSelected && { backgroundColor: theme.primary + '20', borderColor: theme.primary, borderWidth: 1 },
        isPrimary && { backgroundColor: theme.primary, borderColor: theme.primary, borderWidth: 1 },
      ]}
    >
      {isPrimary && <MaterialIcons name="star" size={16} color="#FFF" style={styles.icon} />}
      <Text
        style={[
          styles.label,
          { color: theme.text }, // Default unselected
          isSelected && { color: theme.primary, fontWeight: '600' },
          isPrimary && { color: '#FFF', fontWeight: 'bold' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: 20,
    marginRight: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontSize: Typography.sizes.sm,
  },
  icon: {
    marginRight: 4,
  },
});
