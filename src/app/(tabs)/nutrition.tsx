import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Animated, { FadeInUp, SlideInRight, SlideInLeft, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';
import { SemiCircleProgress } from '../../components/SemiCircleProgress';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { CircularProgress } from '../../components/CircularProgress';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useCallback } from 'react';

const getRelativeDateLabel = (dateStr: string) => {
  const targetDate = new Date(dateStr);
  const today = new Date();
  
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  
  const diffDays = Math.round((d - t) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === -1) return "Hier";
  if (diffDays === -2) return "Avant-hier";
  if (diffDays === 1) return "Demain";
  if (diffDays === 2) return "Après-demain";
  
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(targetDate);
};

export default function NutritionScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  // Extraire l'ID local pour aujourd'hui
  const todayDate = new Date();
  const tYear = todayDate.getFullYear();
  const tMonth = String(todayDate.getMonth() + 1).padStart(2, '0');
  const tDay = String(todayDate.getDate()).padStart(2, '0');
  const todayId = `${tYear}-${tMonth}-${tDay}`;

  const [selectedDateId, setSelectedDateId] = useState(todayId);
  const [direction, setDirection] = useState(1);
  const [dailyData, setDailyData] = useState({ calories: 0, proteins: 0, carbs: 0, fats: 0 });
  const [dailyGoals, setDailyGoals] = useState({ calories: 2500, proteins: 120, carbs: 300, fats: 80 });
  const [checkinAlert, setCheckinAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBilanDone, setIsBilanDone] = useState(true);

  // Nouvel état pour les données corporelles et les repas
  const [bodyStats, setBodyStats] = useState<{ weightkg?: number; body_fat_percentage?: number; muscle_mass_percentage?: number }>({});
  const [mealsData, setMealsData] = useState<Record<string, number>>({
    'Petit-déjeuner': 0,
    'Déjeuner': 0,
    'Collation': 0,
    'Dîner': 0
  });

  useFocusEffect(
    useCallback(() => {
      const fetchLog = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user profile for body stats
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('weightkg, body_fat_percentage, muscle_mass_percentage')
          .eq('id', user.id)
          .maybeSingle();

        if (userProfile) {
          setBodyStats(userProfile);
        }

        // Fetch goals and checkin status
        const { data: profile } = await supabase
          .from('nutrition_profiles')
          .select('*')
          .eq('athlete_id', user.id)
          .maybeSingle();

        if (profile) {
          setDailyGoals({
            calories: profile.target_calories || 2500,
            proteins: profile.target_proteins || 120,
            carbs: profile.target_carbs || 300,
            fats: profile.target_fats || 80,
          });
          
          if (profile.next_checkin_date && new Date(profile.next_checkin_date) < new Date()) {
            setCheckinAlert(true);
          } else {
            setCheckinAlert(false);
          }
          setIsBilanDone(profile.is_bilan_done);
        } else {
          setIsBilanDone(false);
        }

        const { data, error } = await supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('log_date', selectedDateId)
          .maybeSingle();

        if (data) {
          setDailyData({
            calories: Number(data.total_calories || 0),
            proteins: Number(data.total_proteins || 0),
            carbs: Number(data.total_carbs || 0),
            fats: Number(data.total_fats || 0)
          });

          // Fetch entries for meal totals
          const { data: entries } = await supabase
            .from('nutrition_entries')
            .select('meal_type, calories')
            .eq('log_id', data.id);

          if (entries) {
            const newMealsData: Record<string, number> = {
              'Petit-déjeuner': 0,
              'Déjeuner': 0,
              'Collation': 0,
              'Dîner': 0
            };
            entries.forEach((entry) => {
              if (entry.meal_type === 'breakfast') newMealsData['Petit-déjeuner'] += Number(entry.calories || 0);
              if (entry.meal_type === 'lunch') newMealsData['Déjeuner'] += Number(entry.calories || 0);
              if (entry.meal_type === 'snack') newMealsData['Collation'] += Number(entry.calories || 0);
              if (entry.meal_type === 'dinner') newMealsData['Dîner'] += Number(entry.calories || 0);
            });
            setMealsData(newMealsData);
          } else {
            setMealsData({ 'Petit-déjeuner': 0, 'Déjeuner': 0, 'Collation': 0, 'Dîner': 0 });
          }
        } else {
          setDailyData({ calories: 0, proteins: 0, carbs: 0, fats: 0 });
          setMealsData({ 'Petit-déjeuner': 0, 'Déjeuner': 0, 'Collation': 0, 'Dîner': 0 });
        }
        setLoading(false);
      };

      fetchLog();
    }, [selectedDateId])
  );

  const shiftDate = (days: number) => {
    setDirection(days);
    const d = new Date(selectedDateId);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDateId(`${year}-${month}-${day}`);
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-40, 40])
    .onEnd((e) => {
      if (e.translationX < -40) {
        runOnJS(shiftDate)(1); // Swipe left = next day
      } else if (e.translationX > 40) {
        runOnJS(shiftDate)(-1); // Swipe right = prev day
      }
    });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.navButton}>
            <MaterialIcons name="chevron-left" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        rightContent={
          <TouchableOpacity onPress={() => shiftDate(1)} style={styles.navButton}>
            <MaterialIcons name="chevron-right" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        titleComponent={
          <Text style={[styles.headerDateTitle, { color: theme.text }]}>
            {getRelativeDateLabel(selectedDateId)}
          </Text>
        }
      />

      <GestureDetector gesture={swipeGesture}>
        <Animated.View 
          key={selectedDateId}
          entering={direction > 0 ? SlideInRight.duration(300) : SlideInLeft.duration(300)}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            <View>

          <Animated.View entering={FadeInUp.delay(50).springify()}>
            {/* Carte Paramètres / Gestion */}
            {isBilanDone ? (
              <Link href="/nutrition/settings" asChild>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  style={{ marginBottom: Layout.spacing.lg }}
                >
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: Layout.borderRadius.lg,
                    padding: Layout.spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#4F46E5',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 20, marginRight: Layout.spacing.md }}>
                    <MaterialIcons name="settings" size={24} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>Mon nutritionniste</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Typography.sizes.sm, marginTop: 4 }}>Objectifs et répartition des repas</Text>
                  </View>
                  {checkinAlert && (
                    <View style={{ backgroundColor: theme.danger, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>POINT REQUIS</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              </Link>
            ) : (
              <View style={{ marginBottom: Layout.spacing.lg }}>
                <View
                  style={{
                    backgroundColor: theme.surfaceSecondary,
                    borderRadius: Layout.borderRadius.lg,
                    padding: Layout.spacing.md,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <View style={{ backgroundColor: theme.border, padding: 10, borderRadius: 20, marginRight: Layout.spacing.md }}>
                    <MaterialIcons name="lock" size={24} color={theme.icon} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.icon, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>Mon nutritionniste</Text>
                    <Text style={{ color: theme.icon, fontSize: Typography.sizes.sm, marginTop: 4 }}>Bilan requis</Text>
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          <View style={{ position: 'relative' }}>
            <View pointerEvents={isBilanDone ? 'auto' : 'none'}>
              <Animated.View entering={FadeInUp.delay(100).springify()}>
                {/* Carte Résumé (Cliquable) */}
            <Link href={{ pathname: '/nutrition/summary', params: { date: selectedDateId } }} asChild>
              <TouchableOpacity 
                activeOpacity={0.8} 
              >
              <Card style={styles.nutritionCard} elevation="medium">
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Layout.spacing.lg }}>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0 }]}>Calories Consommées</Text>
                  <Text style={{ color: theme.icon, fontSize: Typography.sizes.sm }}>Voir tout</Text>
                </View>
                
                <View style={{ alignItems: 'center', marginBottom: Layout.spacing.xl }}>
                  <SemiCircleProgress 
                    value={dailyData.calories} 
                    max={dailyGoals.calories} 
                    radius={110} 
                    strokeWidth={18} 
                    colorStart="#3B82F6" 
                    colorEnd="#60A5FA" 
                    backgroundColor={theme.surfaceSecondary}
                  >
                    <View style={{ alignItems: 'center', position: 'absolute', bottom: 10 }}>
                      <Text style={{ fontSize: 32, fontWeight: 'bold', color: theme.text }}>
                        <AnimatedNumber value={Math.max(0, dailyGoals.calories - dailyData.calories)} /> kcal
                      </Text>
                      <Text style={{ fontSize: Typography.sizes.sm, color: theme.icon, marginTop: 4 }}>Calories Restantes</Text>
                    </View>
                  </SemiCircleProgress>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: Layout.spacing.lg, marginTop: -10 }}>
                    <View style={{ alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
                        <AnimatedNumber value={dailyData.calories} /> kcal
                      </Text>
                      <Text style={{ fontSize: Typography.sizes.xs, color: theme.icon, marginTop: 2 }}>Consommées</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
                        {dailyGoals.calories} kcal
                      </Text>
                      <Text style={{ fontSize: Typography.sizes.xs, color: theme.icon, marginTop: 2 }}>Objectif</Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Layout.spacing.md }}>
                  <View style={{ flex: 1, marginRight: Layout.spacing.sm }}>
                    <Text style={{ fontSize: Typography.sizes.sm, color: theme.icon, marginBottom: 8 }}>Protéines</Text>
                    <AnimatedProgressBar current={dailyData.proteins} max={dailyGoals.proteins} color="#EC4899" height={6} />
                    <Text style={{ fontSize: Typography.sizes.sm, fontWeight: 'bold', color: theme.text, marginTop: 8 }}><AnimatedNumber value={dailyData.proteins} />/{dailyGoals.proteins}g</Text>
                  </View>
                  
                  <View style={{ flex: 1, marginHorizontal: Layout.spacing.sm }}>
                    <Text style={{ fontSize: Typography.sizes.sm, color: theme.icon, marginBottom: 8 }}>Lipides</Text>
                    <AnimatedProgressBar current={dailyData.fats} max={dailyGoals.fats} color="#F59E0B" height={6} />
                    <Text style={{ fontSize: Typography.sizes.sm, fontWeight: 'bold', color: theme.text, marginTop: 8 }}><AnimatedNumber value={dailyData.fats} />/{dailyGoals.fats}g</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: Layout.spacing.sm }}>
                    <Text style={{ fontSize: Typography.sizes.sm, color: theme.icon, marginBottom: 8 }}>Glucides</Text>
                    <AnimatedProgressBar current={dailyData.carbs} max={dailyGoals.carbs} color="#D97706" height={6} />
                    <Text style={{ fontSize: Typography.sizes.sm, fontWeight: 'bold', color: theme.text, marginTop: 8 }}><AnimatedNumber value={dailyData.carbs} />/{dailyGoals.carbs}g</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
            </Link>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(300).springify()}>
            {/* Liste des Repas */}
            <View style={styles.mealsHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: Layout.spacing.lg, marginBottom: Layout.spacing.sm }]}>Alimentation</Text>
            </View>
            
            {['Petit-déjeuner', 'Déjeuner', 'Collation', 'Dîner'].map((mealName, index) => {
              const mealCalories = mealsData[mealName] || 0;
              let mealTargetPercent = 0.25;
              let mealIcon = "restaurant";
              
              if (mealName === 'Petit-déjeuner') {
                mealTargetPercent = 0.25;
                mealIcon = "free-breakfast";
              } else if (mealName === 'Déjeuner') {
                mealTargetPercent = 0.35;
                mealIcon = "lunch-dining";
              } else if (mealName === 'Collation') {
                mealTargetPercent = 0.10;
                mealIcon = "bakery-dining";
              } else if (mealName === 'Dîner') {
                mealTargetPercent = 0.30;
                mealIcon = "dinner-dining";
              }
              const mealTarget = Math.round(dailyGoals.calories * mealTargetPercent);

              return (
              <TouchableOpacity 
                key={index} 
                style={StyleSheet.flatten([styles.mealCard, { backgroundColor: theme.card, borderColor: theme.border }])}
                onPress={() => router.push({ pathname: '/nutrition/summary', params: { meal: mealName, date: selectedDateId } })}
              >
                <View style={{ marginRight: Layout.spacing.md }}>
                  <CircularProgress 
                    value={mealCalories} 
                    max={mealTarget} 
                    size={56} 
                    strokeWidth={4} 
                    color={theme.primary}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                      <MaterialIcons name={mealIcon as any} size={22} color={theme.icon} />
                    </View>
                  </CircularProgress>
                </View>
                <View style={styles.mealInfo}>
                  <Text style={[styles.mealName, { color: theme.text }]}>{mealName}</Text>
                  <Text style={[styles.mealEmpty, { color: mealCalories > 0 ? theme.primary : theme.icon, marginTop: 2, fontWeight: mealCalories > 0 ? 'bold' : 'normal' }]}>
                    {mealCalories} / {mealTarget} kcal
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={28} color={theme.icon} />
              </TouchableOpacity>
            )})}
          </Animated.View>

          {(bodyStats.weightkg != null || bodyStats.body_fat_percentage != null || bodyStats.muscle_mass_percentage != null) && (
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            {/* Suivi Corporel Refonte */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: Layout.spacing.xl, marginBottom: Layout.spacing.sm }]}>Suivi Corporel</Text>
            <View style={styles.bodyStatsGrid}>
              {bodyStats.weightkg != null && (
                <Card style={styles.bodyStatCard} elevation="none">
                  <MaterialIcons name="monitor-weight" size={24} color={theme.primary} />
                  <Text style={[styles.bodyStatValue, { color: theme.text }]}>{bodyStats.weightkg} <Text style={styles.bodyStatUnit}>kg</Text></Text>
                  <Text style={[styles.bodyStatLabel, { color: theme.icon }]}>Poids</Text>
                </Card>
              )}
              {bodyStats.body_fat_percentage != null && (
                <Card style={styles.bodyStatCard} elevation="none">
                  <MaterialIcons name="pie-chart" size={24} color={'#F59E0B'} />
                  <Text style={[styles.bodyStatValue, { color: theme.text }]}>{bodyStats.body_fat_percentage} <Text style={styles.bodyStatUnit}>%</Text></Text>
                  <Text style={[styles.bodyStatLabel, { color: theme.icon }]}>Masse grasse</Text>
                </Card>
              )}
              {bodyStats.muscle_mass_percentage != null && (
                <Card style={styles.bodyStatCard} elevation="none">
                  <MaterialIcons name="fitness-center" size={24} color={'#3B82F6'} />
                  <Text style={[styles.bodyStatValue, { color: theme.text }]}>{bodyStats.muscle_mass_percentage} <Text style={styles.bodyStatUnit}>%</Text></Text>
                  <Text style={[styles.bodyStatLabel, { color: theme.icon }]}>Muscles</Text>
                </Card>
              )}
            </View>
          </Animated.View>
          )}
          
            </View>

            {!isBilanDone && !loading && (
              <Animated.View entering={FadeInUp.delay(300).springify()} style={[StyleSheet.absoluteFill, { zIndex: 10, borderRadius: Layout.borderRadius.xl, overflow: 'hidden', marginTop: Layout.spacing.lg }]}>
                <BlurView intensity={Platform.OS === 'ios' ? 10 : 25} tint="light" style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <View style={{ backgroundColor: theme.surfaceSecondary, padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10, width: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 8 }}>Activation requise</Text>
                    <Text style={{ fontSize: 14, color: theme.icon, textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
                      Vos jauges et objectifs seront débloqués dès que votre bilan nutritionnel intelligent sera terminé.
                    </Text>
                    <Link href="/nutrition/chat" asChild>
                      <TouchableOpacity 
                        activeOpacity={0.8}
                        style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                      >
                        <MaterialIcons name="auto-awesome" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Faire mon bilan</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </BlurView>
              </Animated.View>
            )}

          </View>
          
            </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerDateTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    textTransform: 'capitalize',
  },
  navButton: {
    padding: Layout.spacing.xs,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: 180, // Espace pour scroller au-dessus du FAB
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  nutritionCard: {
    marginTop: Layout.spacing.sm,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  calorieRemaining: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  nutritionMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieLeftCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.lg,
  },
  macrosRightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  calorieLargeText: {
    fontSize: 28,
    fontWeight: Typography.weights.bold,
  },
  calorieSubText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  macroRow: {
    marginBottom: Layout.spacing.md,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xs,
  },
  macroLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  macroValue: {
    fontSize: Typography.sizes.sm,
  },
  hydrationCard: {
    marginTop: Layout.spacing.md,
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  hydrationValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  waterGlasses: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addWaterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CCC',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.md,
    borderWidth: 1,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.sm,
  },
  mealIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Layout.spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  mealEmpty: {
    fontSize: Typography.sizes.xs,
    fontStyle: 'italic',
  },
  bodyStatsGrid: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
  },
  bodyStatCard: {
    flex: 1,
    alignItems: 'center',
    padding: Layout.spacing.sm,
    borderWidth: 1,
  },
  bodyStatValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginTop: Layout.spacing.sm,
    marginBottom: 2,
  },
  bodyStatUnit: {
    fontSize: Typography.sizes.xs,
    fontWeight: 'normal',
  },
  bodyStatLabel: {
    fontSize: Typography.sizes.xs,
  },
});
