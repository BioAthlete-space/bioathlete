import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { CustomButton } from '../../components/CustomButton';

const { width } = Dimensions.get('window');

const MEAL_FILTERS = ['Journée complète', 'Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'];

// Composant local pour une barre de progression droite avec Label et Valeurs intégrées
const GoalBar = ({ label, current, max, color, unit = 'g', isThin = false }: any) => {
  const theme = useTheme();
  return (
    <View style={styles.goalBarContainer}>
      <View style={styles.goalBarHeader}>
        <Text style={[styles.goalLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.goalValue, { color: theme.text }]}>
          <AnimatedNumber value={current} /> {unit} / {max} {unit}
        </Text>
      </View>
      <AnimatedProgressBar 
        current={current} 
        max={max} 
        color={color} 
        height={isThin ? 6 : 10} 
        delay={100} 
      />
    </View>
  );
};

export default function NutritionSummaryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Si le meal a été passé en paramètre, on s'en sert, sinon on met Journée complète
  const initialFilter = params.meal ? (params.meal as string) : MEAL_FILTERS[0];
  const targetDate = params.date ? (params.date as string) : new Date().toISOString().split('T')[0];

  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [loading, setLoading] = useState(true);

  const [dailyGoals, setDailyGoals] = useState({
    calories: 2500,
    proteins: 120,
    carbs: 300,
    fats: 80,
  });

  const [mealDistribution, setMealDistribution] = useState<Record<string, number>>({
    'Petit-déjeuner': 25,
    'Déjeuner': 35,
    'Collation': 10,
    'Dîner': 30
  });

  const [consumedData, setConsumedData] = useState<Record<string, any>>({
    'Journée complète': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Petit-déjeuner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Déjeuner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Collation': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Dîner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
  });

  const [mealEntries, setMealEntries] = useState<Record<string, any[]>>({
    'Journée complète': [],
    'Petit-déjeuner': [],
    'Déjeuner': [],
    'Collation': [],
    'Dîner': [],
  });

  useFocusEffect(
    useCallback(() => {
      async function fetchData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
         setLoading(false);
         return;
      }

      // Fetch goals
      const { data: profile } = await supabase
        .from('nutrition_profiles')
        .select('target_calories, target_proteins, target_carbs, target_fats, meal_distribution')
        .eq('athlete_id', user.id)
        .maybeSingle();

      if (profile) {
        setDailyGoals({
          calories: profile.target_calories || 2500,
          proteins: profile.target_proteins || 120,
          carbs: profile.target_carbs || 300,
          fats: profile.target_fats || 80,
        });
        if (profile.meal_distribution) {
          setMealDistribution(profile.meal_distribution);
        }
      }

      // Fetch the log for that date
      const { data: logData } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', targetDate)
        .maybeSingle();

      const newData = {
        'Journée complète': {
          calories: logData ? Number(logData.total_calories || 0) : 0,
          proteins: logData ? Number(logData.total_proteins || 0) : 0,
          carbs: logData ? Number(logData.total_carbs || 0) : 0,
          fats: logData ? Number(logData.total_fats || 0) : 0,
        },
        'Petit-déjeuner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
        'Déjeuner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
        'Collation': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
        'Dîner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
      };

      const newEntries: Record<string, any[]> = {
        'Journée complète': [],
        'Petit-déjeuner': [],
        'Déjeuner': [],
        'Collation': [],
        'Dîner': [],
      };

      if (logData) {
        // Fetch the entries
        const { data: entries } = await supabase
          .from('nutrition_entries')
          .select('id, food_name, quantity_g, meal_type, calories, proteins, carbs, fats, is_ai_estimated')
          .eq('log_id', logData.id);

        if (entries) {
          const mapMealType = (dbType: string) => {
            if (dbType === 'breakfast') return 'Petit-déjeuner';
            if (dbType === 'lunch') return 'Déjeuner';
            if (dbType === 'snack') return 'Collation';
            if (dbType === 'dinner') return 'Dîner';
            return null;
          };

          entries.forEach(entry => {
            const frontendMeal = mapMealType(entry.meal_type);
            if (frontendMeal) {
              newData[frontendMeal].calories += Number(entry.calories || 0);
              newData[frontendMeal].proteins += Number(entry.proteins || 0);
              newData[frontendMeal].carbs += Number(entry.carbs || 0);
              newData[frontendMeal].fats += Number(entry.fats || 0);
              
              newEntries[frontendMeal].push(entry);
              newEntries['Journée complète'].push(entry);
            }
          });
        }
      }
      setConsumedData(newData);
      setMealEntries(newEntries);
      setLoading(false);
    }
    fetchData();
  }, [targetDate]));

  const activeData = consumedData[selectedFilter];
  const activeEntries = mealEntries[selectedFilter];

  const getActiveGoals = () => {
    if (selectedFilter === 'Journée complète') {
      return dailyGoals;
    }
    const percent = (mealDistribution[selectedFilter] || 0) / 100;
    return {
      calories: Math.round(dailyGoals.calories * percent),
      proteins: Math.round(dailyGoals.proteins * percent),
      carbs: Math.round(dailyGoals.carbs * percent),
      fats: Math.round(dailyGoals.fats * percent),
    };
  };

  const activeGoals = getActiveGoals();

  const handleDeleteEntry = async (entryId: string) => {
    // Optimistic UI update
    setMealEntries(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = updated[key].filter(e => e.id !== entryId);
      });
      return updated;
    });

    await supabase.from('nutrition_entries').delete().eq('id', entryId);
    
    // Refresh to recalculate totals
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Small delay then trigger effect by doing nothing or we can just fetch again
      router.replace({ pathname: '/nutrition/summary', params: { date: targetDate, meal: selectedFilter } });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }} style={styles.closeBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title="Résumé"
      />



      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Card style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderWidth: 0, marginTop: Layout.spacing.lg }]} elevation="none">
            <View style={styles.cardHeader}>
              <MaterialIcons name="restaurant" size={24} color={theme.icon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>{selectedFilter}</Text>
            </View>
            
            <View style={styles.barsContainer}>
              <GoalBar label="Calories" current={activeData.calories} max={activeGoals.calories} color={theme.primary} unit="kcal" />
              <GoalBar label="Protéines" current={activeData.proteins} max={activeGoals.proteins} color="#3B82F6" />
              <GoalBar label="Glucides" current={activeData.carbs} max={activeGoals.carbs} color="#F59E0B" />
              <GoalBar label="Lipides" current={activeData.fats} max={activeGoals.fats} color="#EF4444" />
            </View>

            {activeData.calories === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.icon, fontStyle: 'italic' }}>Rien de consommé pour le moment.</Text>
              </View>
            )}
            
            <CustomButton 
              title="Ajouter un aliment" 
              icon={<MaterialIcons name="add" size={20} color="#FFF" />} 
              onPress={() => router.push({ pathname: '/nutrition/add', params: { meal: selectedFilter, date: targetDate } })} 
              style={{ marginTop: Layout.spacing.lg }} 
            />
          </Card>
        </Animated.View>

        {activeEntries && activeEntries.length > 0 && (
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: Layout.spacing.md }]}>Aliments ajoutés</Text>
            {activeEntries.map((entry) => (
              <Swipeable
                key={entry.id}
                renderRightActions={() => (
                  <TouchableOpacity 
                    style={styles.deleteButton} 
                    onPress={() => handleDeleteEntry(entry.id)}
                  >
                    <MaterialIcons name="delete" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.foodItem, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => router.push({ pathname: '/nutrition/edit-entry', params: { id: entry.id } })}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={[styles.foodName, { color: theme.text, marginBottom: 0 }]}>{entry.food_name}</Text>
                      {entry.is_ai_estimated && (
                        <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, marginLeft: 8 }}>
                          <Text style={{ color: '#8B5CF6', fontSize: 10, fontWeight: 'bold' }}>✨ IA</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color: theme.icon, fontSize: 13 }}>{entry.quantity_g}g</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{Math.round(entry.calories)} kcal</Text>
                    <Text style={{ color: theme.icon, fontSize: 11 }}>
                      P:{Math.round(entry.proteins)}g G:{Math.round(entry.carbs)}g L:{Math.round(entry.fats)}g
                    </Text>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            ))}
          </Animated.View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeBtn: {
    padding: Layout.spacing.xs,
  },
  pillsContainer: {
    marginBottom: Layout.spacing.md,
  },
  pillsScroll: {
    paddingHorizontal: Layout.spacing.lg,
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  pill: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: 100,
  },
  card: {
    marginBottom: Layout.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginLeft: Layout.spacing.sm,
  },
  barsContainer: {
    gap: Layout.spacing.md,
  },
  goalBarContainer: {
    width: '100%',
  },
  goalBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  goalValue: {
    fontSize: Typography.sizes.sm,
  },
  emptyState: {
    marginTop: Layout.spacing.lg,
    alignItems: 'center',
    paddingVertical: Layout.spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginTop: Layout.spacing.lg,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.xl,
  },
  actionCard: {
    flex: 1,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
  },
  actionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  actionSub: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: Layout.borderRadius.md,
    marginBottom: Layout.spacing.sm,
    marginLeft: Layout.spacing.sm,
  }
});
