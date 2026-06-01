import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { Layout } from '../constants/Layout';

interface FormRowProps {
  label: string;
  value?: string;
  placeholder?: string;
  icon?: string;
  type?: 'text' | 'select' | 'input' | 'switch';
  onPress?: () => void;
  onChangeText?: (text: string) => void;
  isLast?: boolean;
}

export function FormRow({ label, value, placeholder, icon, type = 'select', onPress, onChangeText, isLast = false }: FormRowProps) {
  const theme = useTheme();

  const content = (
    <>
      <View style={styles.left}>
        {icon && <MaterialIcons name={icon as any} size={22} color={theme.icon} style={styles.icon} />}
        <Text style={[styles.label, { color: theme.text }]} numberOfLines={2}>{label}</Text>
      </View>
      <View style={styles.right}>
        {type === 'input' ? (
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={value}
            placeholder={placeholder}
            placeholderTextColor={theme.icon}
            onChangeText={onChangeText}
            textAlign="right"
          />
        ) : (
          <Text style={[styles.value, { color: value ? theme.primary : theme.icon }]} numberOfLines={2} textAlign="right">
            {value || placeholder}
          </Text>
        )}
        {type === 'select' && <MaterialIcons name="chevron-right" size={24} color={theme.icon} style={styles.chevron} />}
      </View>
    </>
  );

  return (
    <View>
      {type === 'select' || onPress ? (
        <TouchableOpacity style={styles.container} onPress={onPress}>
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.container}>
          {content}
        </View>
      )}
      {!isLast && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    minHeight: 56,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.5,
    paddingRight: Layout.spacing.sm,
  },
  icon: {
    marginRight: Layout.spacing.sm,
  },
  label: {
    fontSize: Typography.sizes.md,
    fontWeight: '500',
    flexShrink: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  value: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    flexShrink: 1,
  },
  input: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    flex: 1,
    padding: 0,
    height: '100%',
    textAlign: 'right',
  },
  chevron: {
    marginLeft: Layout.spacing.xs,
  },
  divider: {
    height: 1,
    marginLeft: Layout.spacing.md,
  },
});
