import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { CustomButton } from './CustomButton';

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - 99 + i).reverse(); // 1925 to 2024
const MONTHS = [
  { label: 'Jan', value: 1 }, { label: 'Fév', value: 2 }, { label: 'Mar', value: 3 },
  { label: 'Avr', value: 4 }, { label: 'Mai', value: 5 }, { label: 'Juin', value: 6 },
  { label: 'Juil', value: 7 }, { label: 'Aoû', value: 8 }, { label: 'Sep', value: 9 },
  { label: 'Oct', value: 10 }, { label: 'Nov', value: 11 }, { label: 'Déc', value: 12 }
];

interface Props {
  onValidate: (birthdate: string) => void;
}

export function BirthdatePickerWheel({ onValidate }: Props) {
  const theme = useTheme();
  
  // Default to 25 years ago
  const defaultYear = currentYear - 25;
  const defaultMonth = 1;
  const defaultDay = 15;

  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const dayWheelRef = useRef<any>(null);
  const monthWheelRef = useRef<any>(null);
  const yearWheelRef = useRef<any>(null);

  // Dynamic days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInCurrentMonth = getDaysInMonth(selectedMonth, selectedYear);
  const DAYS = Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1);

  // Auto-correct day if month changes
  if (selectedDay > daysInCurrentMonth) {
    setSelectedDay(daysInCurrentMonth);
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>, data: any[], setter: any, currentValue: any, isObj: boolean = false) => {
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    const index = Math.min(Math.max(0, Math.round(y / ITEM_HEIGHT)), data.length - 1);
    const item = data[index];
    const newVal = isObj ? item.value : item;
    
    if (newVal !== undefined && newVal !== currentValue) {
      setter(newVal);
      Haptics.selectionAsync();
    }
  };

  const renderItem = (label: string | number, isSelected: boolean, onPress: () => void) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={onPress}
        style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
      >
        <Text style={[
          styles.itemText,
          { color: isSelected ? theme.primary : theme.icon },
          isSelected && styles.itemTextSelected
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const emptyPadding = Array.from({ length: Math.floor(VISIBLE_ITEMS / 2) }).fill(null);

  const handleConfirm = () => {
    // Format YYYY-MM-DD
    const mm = selectedMonth.toString().padStart(2, '0');
    const dd = selectedDay.toString().padStart(2, '0');
    onValidate(`${selectedYear}-${mm}-${dd}`);
  };

  return (
    <Animated.View entering={FadeInUp.springify()} style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Date de naissance</Text>
      
      <View style={styles.wheelWrapper}>
        <View style={[styles.selectionOverlay, { backgroundColor: theme.surfaceSecondary }]} pointerEvents="none" />
        
        {/* DAY WHEEL */}
        <Animated.FlatList
          ref={dayWheelRef}
          data={[...emptyPadding, ...DAYS, ...emptyPadding]}
          keyExtractor={(item, index) => `day-${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={(e) => handleScroll(e, DAYS, setSelectedDay, selectedDay)}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialScrollIndex={DAYS.indexOf(defaultDay)}
          renderItem={({ item }) => {
            if (item === null) return <View style={{ height: ITEM_HEIGHT }} />;
            const val = item as number;
            return renderItem(val, val === selectedDay, () => {
              dayWheelRef.current?.scrollToOffset({ offset: DAYS.indexOf(val) * ITEM_HEIGHT, animated: true });
            });
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />

        {/* MONTH WHEEL */}
        <Animated.FlatList
          ref={monthWheelRef}
          data={[...emptyPadding, ...MONTHS, ...emptyPadding]}
          keyExtractor={(item, index) => `month-${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={(e) => handleScroll(e, MONTHS, setSelectedMonth, selectedMonth, true)}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialScrollIndex={MONTHS.findIndex(m => m.value === defaultMonth)}
          renderItem={({ item }) => {
            if (item === null) return <View style={{ height: ITEM_HEIGHT }} />;
            const obj = item as {label: string, value: number};
            return renderItem(obj.label, obj.value === selectedMonth, () => {
              monthWheelRef.current?.scrollToOffset({ offset: MONTHS.findIndex(m => m.value === obj.value) * ITEM_HEIGHT, animated: true });
            });
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />

        {/* YEAR WHEEL */}
        <Animated.FlatList
          ref={yearWheelRef}
          data={[...emptyPadding, ...YEARS, ...emptyPadding]}
          keyExtractor={(item, index) => `year-${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={(e) => handleScroll(e, YEARS, setSelectedYear, selectedYear)}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialScrollIndex={YEARS.indexOf(defaultYear)}
          renderItem={({ item }) => {
            if (item === null) return <View style={{ height: ITEM_HEIGHT }} />;
            const val = item as number;
            return renderItem(val, val === selectedYear, () => {
              yearWheelRef.current?.scrollToOffset({ offset: YEARS.indexOf(val) * ITEM_HEIGHT, animated: true });
            });
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      </View>

      <CustomButton 
        title="Confirmer" 
        onPress={handleConfirm} 
        style={{ marginTop: 24, width: '100%' }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    alignItems: 'center',
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 24,
  },
  wheelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: '100%',
    position: 'relative',
    paddingHorizontal: 10,
  },
  selectionOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    width: '100%',
    height: ITEM_HEIGHT,
    borderRadius: 12,
    opacity: 0.5,
    left: 10,
  },
  list: {
    flexGrow: 0,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: '30%',
  },
  listContent: {
    alignItems: 'center',
  },
  itemContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  itemText: {
    fontSize: 20,
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize: 24,
    fontWeight: 'bold',
  }
});
