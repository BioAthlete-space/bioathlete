import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, SlideInRight } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

// Helper to debounce API calls
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function NutritionAddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const mealType = (params.meal as string) || 'Petit-déjeuner';
  const targetDate = (params.date as string) || new Date().toISOString().split('T')[0];

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantityStr, setQuantityStr] = useState('100');

  useEffect(() => {
    const fetchFoods = async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`https://fr.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(debouncedQuery)}&search_simple=1&action=process&json=1&page_size=15`);
        const data = await response.json();
        if (data && data.products) {
          const formattedProducts = data.products.map((p: any) => ({
            id: p.code,
            name: p.product_name || 'Inconnu',
            brand: p.brands || '',
            image: p.image_url || p.image_front_thumb_url || null,
            calories: p.nutriments?.['energy-kcal_100g'] || 0,
            proteins: p.nutriments?.proteins_100g || 0,
            carbs: p.nutriments?.carbohydrates_100g || 0,
            fats: p.nutriments?.fat_100g || 0,
          }));
          setResults(formattedProducts.filter((p: any) => p.name !== 'Inconnu'));
        }
      } catch (err) {
        console.error("Erreur API OFF:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFoods();
  }, [debouncedQuery]);

  const mapMealTypeToDB = (frontendMeal: string) => {
    if (frontendMeal === 'Petit-déjeuner') return 'breakfast';
    if (frontendMeal === 'Déjeuner') return 'lunch';
    if (frontendMeal === 'Collation') return 'snack';
    if (frontendMeal === 'Dîner') return 'dinner';
    return 'snack';
  };

  const handleSave = async () => {
    if (!selectedFood) return;

    const qty = parseFloat(quantityStr) || 0;
    if (qty <= 0) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Find or create the log for the target date
      let logId;
      const { data: existingLog } = await supabase
        .from('nutrition_logs')
        .select('id, total_calories, total_proteins, total_carbs, total_fats')
        .eq('user_id', user.id)
        .eq('log_date', targetDate)
        .maybeSingle();

      const multiplier = qty / 100;
      const addedCals = Math.round(selectedFood.calories * multiplier);
      const addedProts = Math.round(selectedFood.proteins * multiplier);
      const addedCarbs = Math.round(selectedFood.carbs * multiplier);
      const addedFats = Math.round(selectedFood.fats * multiplier);

      if (existingLog) {
        logId = existingLog.id;
        // Update the totals in nutrition_logs
        await supabase
          .from('nutrition_logs')
          .update({
            total_calories: (existingLog.total_calories || 0) + addedCals,
            total_proteins: (existingLog.total_proteins || 0) + addedProts,
            total_carbs: (existingLog.total_carbs || 0) + addedCarbs,
            total_fats: (existingLog.total_fats || 0) + addedFats
          })
          .eq('id', logId);
      } else {
        // Create new log (we omit date and athlete_id here as user_id and log_date are primary observed keys in other screens)
        const { data: newLog, error: logError } = await supabase
          .from('nutrition_logs')
          .insert({
            user_id: user.id,
            log_date: targetDate,
            total_calories: addedCals,
            total_proteins: addedProts,
            total_carbs: addedCarbs,
            total_fats: addedFats
          })
          .select('id')
          .single();

        if (logError) throw logError;
        if (newLog) logId = newLog.id;
      }

      // Insert the entry
      if (logId) {
        await supabase.from('nutrition_entries').insert({
          log_id: logId,
          food_name: selectedFood.name,
          portion_g: qty,
          calories: addedCals,
          proteins: addedProts,
          carbs: addedCarbs,
          fats: addedFats,
          meal_type: mapMealTypeToDB(mealType)
        });
      }

      router.back();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'aliment:", error);
      alert("Erreur lors de l'enregistrement. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <TouchableOpacity
        style={[styles.resultItem, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
        onPress={() => setSelectedFood(item)}
      >
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.foodImage} />
        ) : (
          <View style={[styles.foodImagePlaceholder, { backgroundColor: theme.card }]}>
            <MaterialIcons name="fastfood" size={20} color={theme.icon} />
          </View>
        )}
        <View style={styles.foodInfo}>
          <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          {item.brand ? <Text style={[styles.foodBrand, { color: theme.icon }]} numberOfLines={1}>{item.brand}</Text> : null}
          <Text style={[styles.foodMacros, { color: theme.primary }]}>
            {Math.round(item.calories)} kcal • P: {Math.round(item.proteins)}g • G: {Math.round(item.carbs)}g • L: {Math.round(item.fats)}g (pour 100g)
          </Text>
        </View>
        <MaterialIcons name="add-circle-outline" size={24} color={theme.primary} />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialIcons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title={`Ajouter - ${mealType}`}
      />

      <View style={styles.content}>
        {!selectedFood ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.searchContainer, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
              <MaterialIcons name="search" size={24} color={theme.icon} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Rechercher un aliment..."
                placeholderTextColor={theme.icon}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <MaterialIcons name="cancel" size={20} color={theme.icon} />
                </TouchableOpacity>
              )}
            </View>

            {loading && !results.length ? (
              <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: Layout.spacing.xl }} />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  query.length > 2 && !loading ? (
                    <Text style={{ color: theme.icon, textAlign: 'center', marginTop: Layout.spacing.xl }}>Aucun résultat trouvé.</Text>
                  ) : null
                }
              />
            )}
          </Animated.View>
        ) : (
          <Animated.View entering={SlideInRight.springify()} style={styles.selectedFoodContainer}>
            <Card style={styles.foodDetailsCard} elevation="medium">
              <TouchableOpacity onPress={() => setSelectedFood(null)} style={styles.backToSearchBtn}>
                <MaterialIcons name="arrow-back" size={20} color={theme.icon} />
                <Text style={{ color: theme.icon, marginLeft: 4 }}>Retour</Text>
              </TouchableOpacity>

              <View style={{ alignItems: 'center', marginBottom: Layout.spacing.lg }}>
                {selectedFood.image ? (
                  <Image source={{ uri: selectedFood.image }} style={styles.largeFoodImage} />
                ) : (
                  <View style={[styles.largeFoodImage, { backgroundColor: theme.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }]}>
                    <MaterialIcons name="fastfood" size={48} color={theme.icon} />
                  </View>
                )}
                <Text style={[styles.selectedFoodName, { color: theme.text, textAlign: 'center' }]}>{selectedFood.name}</Text>
                {selectedFood.brand ? <Text style={[styles.selectedFoodBrand, { color: theme.icon }]}>{selectedFood.brand}</Text> : null}
              </View>

              <View style={styles.quantityContainer}>
                <Text style={[styles.quantityLabel, { color: theme.text }]}>Quantité (g)</Text>
                <TextInput
                  style={[styles.quantityInput, { color: theme.text, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                  keyboardType="numeric"
                  value={quantityStr}
                  onChangeText={setQuantityStr}
                />
              </View>

              <View style={[styles.macrosSummary, { backgroundColor: theme.surfaceSecondary }]}>
                {['Calories', 'Protéines', 'Glucides', 'Lipides'].map((macro, idx) => {
                  const qty = parseFloat(quantityStr) || 0;
                  const multiplier = qty / 100;
                  let val = 0;
                  let unit = 'g';
                  if (idx === 0) { val = selectedFood.calories * multiplier; unit = 'kcal'; }
                  if (idx === 1) val = selectedFood.proteins * multiplier;
                  if (idx === 2) val = selectedFood.carbs * multiplier;
                  if (idx === 3) val = selectedFood.fats * multiplier;

                  return (
                    <View key={macro} style={styles.macroBox}>
                      <Text style={[styles.macroVal, { color: theme.text }]}>{Math.round(val)}{unit}</Text>
                      <Text style={[styles.macroLabel, { color: theme.icon }]}>{macro}</Text>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Valider l'ajout</Text>
                )}
              </TouchableOpacity>
            </Card>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    padding: Layout.spacing.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.md,
    borderRadius: 25,
    borderWidth: 1,
    height: 50,
    marginBottom: Layout.spacing.md,
  },
  searchIcon: {
    marginRight: Layout.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: Typography.sizes.md,
  },
  listContent: {
    paddingBottom: Layout.spacing.xxl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    marginBottom: Layout.spacing.sm,
  },
  foodImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: Layout.spacing.md,
  },
  foodImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: Layout.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  foodBrand: {
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  foodMacros: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    fontWeight: Typography.weights.medium,
  },
  selectedFoodContainer: {
    flex: 1,
    marginTop: Layout.spacing.md,
  },
  foodDetailsCard: {
    padding: Layout.spacing.lg,
  },
  backToSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  largeFoodImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
    marginBottom: Layout.spacing.md,
  },
  selectedFoodName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  selectedFoodBrand: {
    fontSize: Typography.sizes.md,
    marginTop: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xl,
    marginTop: Layout.spacing.lg,
  },
  quantityLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  quantityInput: {
    width: 100,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
  },
  macrosSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.xl,
  },
  macroBox: {
    alignItems: 'center',
    flex: 1,
  },
  macroVal: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  macroLabel: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  saveBtn: {
    padding: Layout.spacing.md,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
});
