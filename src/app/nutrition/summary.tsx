import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
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
import { useLocalSearchParams } from 'expo-router';

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

  const [consumedData, setConsumedData] = useState<Record<string, any>>({
    'Journée complète': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Petit-déjeuner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Déjeuner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Collation': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
    'Dîner': { calories: 0, proteins: 0, carbs: 0, fats: 0 },
  });

  useEffect(() => {
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
        .select('target_calories, target_proteins, target_carbs, target_fats')
        .eq('athlete_id', user.id)
        .maybeSingle();

      if (profile) {
        setDailyGoals({
          calories: profile.target_calories || 2500,
          proteins: profile.target_proteins || 120,
          carbs: profile.target_carbs || 300,
          fats: profile.target_fats || 80,
        });
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

      if (logData) {
        // Fetch the entries
        const { data: entries } = await supabase
          .from('nutrition_entries')
          .select('meal_type, calories, proteins, carbs, fats')
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
            }
          });
        }
      }
      setConsumedData(newData);
      setLoading(false);
    }
    
    fetchData();
  }, [targetDate]);

  const activeData = consumedData[selectedFilter];

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

      {/* Pilules de filtres horizontales (Navigation) */}
      <View style={styles.pillsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
          {MEAL_FILTERS.map((filter) => {
            const isActive = filter === 'Journée complète';
            return (
              <TouchableOpacity
                key={filter}
                onPress={() => {
                  if (filter === 'Journée complète') return;
                  router.push({ pathname: `/nutrition/meal/${filter}`, params: { date: targetDate } });
                }}
                style={[
                  styles.pill,
                  { 
                    backgroundColor: isActive ? theme.primary : theme.surfaceSecondary,
                    borderColor: isActive ? theme.primary : theme.border 
                  }
                ]}
              >
                <Text style={[styles.pillText, { color: isActive ? '#FFF' : theme.text }]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <Card style={styles.card} elevation="medium">
            <View style={styles.cardHeader}>
              <MaterialIcons name="flag" size={24} color={theme.primary} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Objectifs de la journée</Text>
            </View>
            
            <View style={styles.barsContainer}>
              <GoalBar label="Calories" current={activeData.calories} max={dailyGoals.calories} color={theme.primary} unit="kcal" />
              <GoalBar label="Protéines" current={activeData.proteins} max={dailyGoals.proteins} color="#3B82F6" />
              <GoalBar label="Glucides" current={activeData.carbs} max={dailyGoals.carbs} color="#F59E0B" />
              <GoalBar label="Lipides" current={activeData.fats} max={dailyGoals.fats} color="#EF4444" />
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Card style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderWidth: 0, marginTop: Layout.spacing.lg }]} elevation="none">
            <View style={styles.cardHeader}>
              <MaterialIcons name="restaurant" size={24} color={theme.icon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Consommé : Journée complète</Text>
            </View>
            
            <View style={styles.barsContainer}>
              <GoalBar label="Calories" current={activeData.calories} max={dailyGoals.calories} color={theme.primary} unit="kcal" isThin={true} />
              <GoalBar label="Protéines" current={activeData.proteins} max={dailyGoals.proteins} color="#3B82F6" isThin={true} />
              <GoalBar label="Glucides" current={activeData.carbs} max={dailyGoals.carbs} color="#F59E0B" isThin={true} />
              <GoalBar label="Lipides" current={activeData.fats} max={dailyGoals.fats} color="#EF4444" isThin={true} />
            </View>

            {activeData.calories === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ color: theme.icon, fontStyle: 'italic' }}>Rien de consommé pour le moment.</Text>
              </View>
            )}
          </Card>
        </Animated.View>

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
  }
});
