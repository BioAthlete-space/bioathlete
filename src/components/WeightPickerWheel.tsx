import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { FadeInUp, useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomButton } from './CustomButton';

const ITEM_HEIGHT = 60;
const VISIBLE_ITEMS = 5;

// Generate ranges
const KILOS = Array.from({ length: 150 - 40 + 1 }, (_, i) => i + 40); // 40 to 150
const DECIMALS = Array.from({ length: 10 }, (_, i) => i); // 0 to 9

interface Props {
  onValidate: (weight: string) => void;
}

export function WeightPickerWheel({ onValidate }: Props) {
  const theme = useTheme();
  
  const [selectedKilo, setSelectedKilo] = useState(75);
  const [selectedDecimal, setSelectedDecimal] = useState(0);

  const kiloRef = useRef<any>(null);
  const decimalRef = useRef<any>(null);

  const handleKiloScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    const index = Math.round(y / ITEM_HEIGHT);
    const newVal = KILOS[index];
    if (newVal !== undefined && newVal !== selectedKilo) {
      setSelectedKilo(newVal);
      Haptics.selectionAsync();
    }
  };

  const handleDecimalScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    const index = Math.round(y / ITEM_HEIGHT);
    const newVal = DECIMALS[index];
    if (newVal !== undefined && newVal !== selectedDecimal) {
      setSelectedDecimal(newVal);
      Haptics.selectionAsync();
    }
  };

  const renderKiloItem = (item: number, isSelected: boolean) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => kiloRef.current?.scrollToOffset({ offset: KILOS.indexOf(item) * ITEM_HEIGHT, animated: true })}
        style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
      >
        <Text style={[
          styles.itemText,
          { color: isSelected ? theme.primary : theme.icon },
          isSelected && styles.itemTextSelected
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDecimalItem = (item: number, isSelected: boolean) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => decimalRef.current?.scrollToOffset({ offset: DECIMALS.indexOf(item) * ITEM_HEIGHT, animated: true })}
        style={[styles.itemContainer, { height: ITEM_HEIGHT }]}
      >
        <Text style={[
          styles.itemText,
          { color: isSelected ? theme.primary : theme.icon },
          isSelected && styles.itemTextSelected
        ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  // Add empty spaces for padding top and bottom so items can reach the center
  const emptyPadding = Array.from({ length: Math.floor(VISIBLE_ITEMS / 2) }).fill(null);

  return (
    <Animated.View entering={FadeInUp.springify()} style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Sélectionne ton poids actuel</Text>
      
      <View style={styles.wheelWrapper}>
        <View style={[styles.selectionOverlay, { backgroundColor: theme.surfaceSecondary }]} pointerEvents="none" />
        
        {/* KILOS WHEEL */}
        <Animated.FlatList
          ref={kiloRef}
          data={[...emptyPadding, ...KILOS, ...emptyPadding]}
          keyExtractor={(item, index) => `kilo-${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleKiloScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialScrollIndex={KILOS.indexOf(75)}
          renderItem={({ item }) => {
            if (item === null) return <View style={{ height: ITEM_HEIGHT }} />;
            return renderKiloItem(item as number, item === selectedKilo);
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
        
        <Text style={[styles.separator, { color: theme.text }]}>.</Text>
        
        {/* DECIMALS WHEEL */}
        <Animated.FlatList
          ref={decimalRef}
          data={[...emptyPadding, ...DECIMALS, ...emptyPadding]}
          keyExtractor={(item, index) => `dec-${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleDecimalScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialScrollIndex={0}
          renderItem={({ item }) => {
            if (item === null) return <View style={{ height: ITEM_HEIGHT }} />;
            return renderDecimalItem(item as number, item === selectedDecimal);
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
        
        <Text style={[styles.unit, { color: theme.icon }]}>kg</Text>
      </View>

      <CustomButton 
        title="Confirmer" 
        onPress={() => onValidate(`${selectedKilo}.${selectedDecimal}`)} 
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
    justifyContent: 'center',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: '100%',
    position: 'relative',
  },
  selectionOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    width: '100%',
    height: ITEM_HEIGHT,
    borderRadius: 12,
    opacity: 0.5,
  },
  list: {
    flexGrow: 0,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
    width: 80,
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
    fontSize: 24,
    fontWeight: '500',
  },
  itemTextSelected: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  separator: {
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  unit: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    alignSelf: 'center',
  }
});
