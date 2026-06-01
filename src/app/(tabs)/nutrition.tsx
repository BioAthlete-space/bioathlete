import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import { AnimatedProgressBar } from '../../components/AnimatedProgressBar';
import { CircularProgress } from '../../components/CircularProgress';
import { AnimatedNumber } from '../../components/AnimatedNumber';

// Générateur de calendrier dynamique pour la nutrition
const generateRollingCalendar = () => {
  const dates = [];
  const today = new Date();
  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  for (let i = -60; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // Utiliser l'heure locale pour éviter le décalage UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    dates.push({
      id: `${year}-${month}-${day}`,
      dateObj: d,
      dayStr: daysOfWeek[d.getDay()],
      dateStr: d.getDate().toString(),
      isToday: i === 0,
      // Simuler si la journée a été trackée
      logged: i <= 0, // Les jours passés et aujourd'hui ont des données, le futur non
    });
  }
  return dates;
};

export default function NutritionScreen() {
  const theme = useTheme();
  
  const [calendarDays, setCalendarDays] = useState(generateRollingCalendar());
  
  // Extraire l'ID local pour aujourd'hui
  const todayDate = new Date();
  const tYear = todayDate.getFullYear();
  const tMonth = String(todayDate.getMonth() + 1).padStart(2, '0');
  const tDay = String(todayDate.getDate()).padStart(2, '0');
  const todayId = `${tYear}-${tMonth}-${tDay}`;

  const [selectedDateId, setSelectedDateId] = useState(todayId);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Centrer le calendrier sur "aujourd'hui" (index 60)
    setTimeout(() => {
      const todayIndex = 60;
      const itemWidth = 60 + Layout.spacing.sm; // Largeur du bouton + gap
      const screenWidth = Layout.window.width;
      const centerOffset = (todayIndex * itemWidth) - (screenWidth / 2) + (itemWidth / 2) + Layout.spacing.lg;
      
      scrollViewRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: false });
    }, 100);
  }, []);

  const selectedDayInfo = calendarDays.find(d => d.id === selectedDateId);

  // Formatter pour le mois affiché au dessus du calendrier
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const displayedMonth = selectedDayInfo ? monthFormatter.format(selectedDayInfo.dateObj) : '';
  const capitalizedMonth = displayedMonth.charAt(0).toUpperCase() + displayedMonth.slice(1);


  // Mock Repas
  const meals = [
    { name: 'Petit-déjeuner', cals: 450, target: 600, time: '08:00', icon: 'free-breakfast' },
    { name: 'Déjeuner', cals: 850, target: 1100, time: '13:00', icon: 'lunch-dining' },
    { name: 'Collation', cals: 0, target: 400, time: '16:30', icon: 'local-cafe' },
    { name: 'Dîner', cals: 0, target: 1000, time: '20:00', icon: 'dinner-dining' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Nutrition" />
      
      {/* Calendrier Horizontal */}
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeaderRow}>
          <Text style={[styles.monthText, { color: theme.text }]}>{capitalizedMonth}</Text>
        </View>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.calendarScroll}
        >
          {calendarDays.map((item) => {
            const isSelected = item.id === selectedDateId;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedDateId(item.id)}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: isSelected ? theme.primary : 'transparent',
                    borderColor: isSelected ? theme.primary : theme.border,
                  }
                ]}
              >
                <Text style={[styles.dayText, { color: isSelected ? '#FFF' : theme.icon }]}>{item.dayStr}</Text>
                <Text style={[styles.dateText, { color: isSelected ? '#FFF' : theme.text }]}>{item.dateStr}</Text>
                <View 
                  style={[
                    styles.logDot, 
                    { backgroundColor: item.logged ? (isSelected ? '#FFF' : theme.primary) : 'transparent' }
                  ]} 
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {selectedDayInfo?.logged ? (
          <View key={`nutrition-content-${selectedDateId}`}>
        
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          {/* Nutrition Globale : Calories + Macros (Fusionnés) */}
          <Card style={styles.nutritionCard} elevation="medium">
            <View style={styles.calorieHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Résumé</Text>
              <Text style={[styles.calorieRemaining, { color: theme.icon }]}>1240 kcal rest.</Text>
            </View>
            
            <View style={styles.nutritionMainRow}>
              <View style={styles.calorieLeftCol}>
                <CircularProgress value={2260} max={3500} size={130} strokeWidth={12} color={theme.primary}>
                  <AnimatedNumber 
                    value={2260} 
                    style={[styles.calorieLargeText, { color: theme.text }]} 
                  />
                  <Text style={[styles.calorieSubText, { color: theme.icon, marginTop: 2 }]}>/ 3500 kcal</Text>
                </CircularProgress>
              </View>

              <View style={styles.macrosRightCol}>
                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroLabel, { color: theme.text }]}>Protéines</Text>
                    <Text style={[styles.macroValue, { color: theme.text }]}>
                      <AnimatedNumber value={120} /> / 160g
                    </Text>
                  </View>
                  <AnimatedProgressBar current={120} max={160} color="#3B82F6" delay={200} />
                </View>

                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroLabel, { color: theme.text }]}>Glucides</Text>
                    <Text style={[styles.macroValue, { color: theme.text }]}>
                      <AnimatedNumber value={250} /> / 400g
                    </Text>
                  </View>
                  <AnimatedProgressBar current={250} max={400} color="#F59E0B" delay={300} />
                </View>

                <View style={styles.macroRow}>
                  <View style={styles.macroHeader}>
                    <Text style={[styles.macroLabel, { color: theme.text }]}>Lipides</Text>
                    <Text style={[styles.macroValue, { color: theme.text }]}>
                      <AnimatedNumber value={60} /> / 80g
                    </Text>
                  </View>
                  <AnimatedProgressBar current={60} max={80} color="#EF4444" delay={400} />
                </View>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()}>
          {/* Suivi Hydratation */}
          <Card style={styles.hydrationCard}>
            <View style={styles.hydrationHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Hydratation</Text>
              <Text style={[styles.hydrationValue, { color: '#0EA5E9' }]}>1.5 / 3.0 L</Text>
            </View>
            <View style={styles.waterGlasses}>
              {[1, 2, 3, 4, 5, 6].map((glass, idx) => (
                <TouchableOpacity key={idx}>
                  <MaterialIcons 
                    name="local-drink" 
                    size={32} 
                    color={idx < 3 ? '#0EA5E9' : theme.surfaceSecondary} 
                  />
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addWaterBtn}>
                <MaterialIcons name="add" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).springify()}>
          {/* Repas du jour */}
          <View style={styles.mealsHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: Layout.spacing.lg }]}>Repas</Text>
          </View>
          
          {meals.map((meal, index) => (
            <TouchableOpacity key={index} style={[styles.mealCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.mealIconWrapper, { backgroundColor: theme.surfaceSecondary }]}>
                <MaterialIcons name={meal.icon as any} size={24} color={meal.cals > 0 ? theme.primary : theme.icon} />
              </View>
              <View style={styles.mealInfo}>
                <Text style={[styles.mealName, { color: theme.text }]}>{meal.name}</Text>
                {meal.cals > 0 ? (
                  <View style={{ marginTop: 2 }}>
                    <Text style={[styles.mealTime, { color: theme.icon, marginBottom: 6 }]}>
                      {meal.time} • <Text style={{ color: theme.text, fontWeight: 'bold' }}><AnimatedNumber value={meal.cals} /> kcal</Text> / {meal.target}
                    </Text>
                    <AnimatedProgressBar current={meal.cals} max={meal.target} color={theme.primary} height={4} delay={500 + index * 100} />
                  </View>
                ) : (
                  <Text style={[styles.mealEmpty, { color: theme.icon, marginTop: 2 }]}>Objectif : {meal.target} kcal</Text>
                )}
              </View>
              <MaterialIcons name="add-circle" size={28} color={theme.primary} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).springify()}>
          {/* Suivi Corporel Refonte */}
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: Layout.spacing.xl, marginBottom: Layout.spacing.sm }]}>Suivi Corporel</Text>
          <View style={styles.bodyStatsGrid}>
            <Card style={styles.bodyStatCard} elevation="none">
              <MaterialIcons name="monitor-weight" size={24} color={theme.primary} />
              <Text style={[styles.bodyStatValue, { color: theme.text }]}>74.5 <Text style={styles.bodyStatUnit}>kg</Text></Text>
              <Text style={[styles.bodyStatLabel, { color: theme.icon }]}>Poids</Text>
            </Card>
            <Card style={styles.bodyStatCard} elevation="none">
              <MaterialIcons name="pie-chart" size={24} color={'#F59E0B'} />
              <Text style={[styles.bodyStatValue, { color: theme.text }]}>12.5 <Text style={styles.bodyStatUnit}>%</Text></Text>
              <Text style={[styles.bodyStatLabel, { color: theme.icon }]}>Masse grasse</Text>
            </Card>
            <Card style={styles.bodyStatCard} elevation="none">
              <MaterialIcons name="fitness-center" size={24} color={'#3B82F6'} />
              <Text style={[styles.bodyStatValue, { color: theme.text }]}>45.2 <Text style={styles.bodyStatUnit}>%</Text></Text>
              <Text style={[styles.bodyStatLabel, { color: theme.icon }]}>Muscles</Text>
            </Card>
          </View>
        </Animated.View>
        </View>
        ) : (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={{ alignItems: 'center', marginTop: Layout.spacing.xxl }} key={`empty-${selectedDateId}`}>
            <MaterialIcons name="restaurant" size={64} color={theme.icon} style={{ opacity: 0.5, marginBottom: Layout.spacing.md }} />
            <Text style={{ color: theme.text, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>Aucun repas enregistré</Text>
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: Layout.spacing.sm }}>Commencez à suivre votre alimentation pour cette journée en ajoutant votre premier repas.</Text>
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
  calendarContainer: {
    paddingVertical: Layout.spacing.sm,
  },
  calendarScroll: {
    paddingHorizontal: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  dayButton: {
    width: 60,
    height: 76,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  dateText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
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
  mealTime: {
    fontSize: Typography.sizes.xs,
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
  monthHeaderRow: {
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
  },
  monthText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
});
