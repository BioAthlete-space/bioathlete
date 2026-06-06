import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Typography } from '../constants/Typography';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;

export interface WheelColumnProps {
  data: Array<{ label: string; value: string | number }>;
  value: string | number;
  onChange: (value: string | number) => void;
  theme?: any;
}
import { useTheme } from '../hooks/useThemeColor';

export function WheelColumn({ data, value, onChange, theme: propTheme }: WheelColumnProps) {
  const fallbackTheme = useTheme();
  const theme = propTheme || fallbackTheme;
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const index = data.findIndex(d => d.value === value);
    if (index >= 0) {
      setCurrentIndex(index);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
      }, 50);
    }
  }, []);

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_HEIGHT)));
    
    if (index !== currentIndex) {
      setCurrentIndex(index);
      onChange(data[index].value);
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync().catch(() => {});
      }
    }
  };

  return (
    <View style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
      >
        {data.map((item, index) => {
          const isSelected = index === currentIndex;
          return (
            <View key={item.value} style={[styles.item, { height: ITEM_HEIGHT }]}>
              <Text 
                style={[
                  styles.itemText, 
                  { color: isSelected ? theme.text : theme.icon, fontWeight: isSelected ? '600' : '400' }
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: Typography.sizes.lg,
  },
});
