import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useThemeColor';
import { Typography } from '../constants/Typography';
import { CustomButton } from './CustomButton';

const ITEM_HEIGHT = 60;
const VISIBLE_ITEMS = 5;

// Generate range for height (140cm to 230cm)
const CMS = Array.from({ length: 230 - 140 + 1 }, (_, i) => i + 140);

interface Props {
  gender: string; // 'Homme', 'Femme', or anything else
  onValidate: (height: string) => void;
}

export function HeightPickerWheel({ gender, onValidate }: Props) {
  const theme = useTheme();
  
  // Default logic: Femme -> 165, Homme/Other -> 180
  const defaultHeight = (gender.toLowerCase() === 'femme' || gender === 'F') ? 165 : 180;
  const [selectedCm, setSelectedCm] = useState(defaultHeight);

  const wheelRef = useRef<any>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = Math.max(0, event.nativeEvent.contentOffset.y);
    const index = Math.round(y / ITEM_HEIGHT);
    const newVal = CMS[index];
    if (newVal !== undefined && newVal !== selectedCm) {
      setSelectedCm(newVal);
      Haptics.selectionAsync();
    }
  };

  const renderItem = (item: number, isSelected: boolean) => {
    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => wheelRef.current?.scrollToOffset({ offset: CMS.indexOf(item) * ITEM_HEIGHT, animated: true })}
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

  const emptyPadding = Array.from({ length: Math.floor(VISIBLE_ITEMS / 2) }).fill(null);

  return (
    <Animated.View entering={FadeInUp.springify()} style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Sélectionne ta taille</Text>
      
      <View style={styles.wheelWrapper}>
        <View style={[styles.selectionOverlay, { backgroundColor: theme.surfaceSecondary }]} pointerEvents="none" />
        
        <Animated.FlatList
          ref={wheelRef}
          data={[...emptyPadding, ...CMS, ...emptyPadding]}
          keyExtractor={(item, index) => `cm-${index}`}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
          initialScrollIndex={CMS.indexOf(defaultHeight)}
          renderItem={({ item }) => {
            if (item === null) return <View style={{ height: ITEM_HEIGHT }} />;
            return renderItem(item as number, item === selectedCm);
          }}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
        
        <Text style={[styles.unit, { color: theme.icon }]}>cm</Text>
      </View>

      <CustomButton 
        title="Confirmer" 
        onPress={() => onValidate(`${selectedCm}`)} 
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
    width: 100,
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
  unit: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    alignSelf: 'center',
  }
});
