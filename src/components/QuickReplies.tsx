import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../hooks/useThemeColor';

interface QuickRepliesProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  style?: any;
}

export const QuickReplies: React.FC<QuickRepliesProps> = ({ suggestions, onSelect, style }) => {
  const theme = useTheme();

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInUp} style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onSelect(suggestion)}
            style={[
              styles.chip,
              {
                borderColor: theme.primary,
                backgroundColor: 'transparent',
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, { color: theme.primary }]}>
              {suggestion}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  chip: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
