import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, Pressable } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { CustomButton } from '../../components/CustomButton';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { generateAndShareReport } from '../../lib/pdfGenerator';

const ACTIVITY_LEVELS = [
  { level: 'Sédentaire', desc: 'Presque aucun exercice, travail de bureau.' },
  { level: 'Léger', desc: '1 à 2 séances par semaine, activité quotidienne légère.' },
  { level: 'Modéré', desc: '3 à 4 entraînements par semaine, mode de vie actif.' },
  { level: 'Intense', desc: '4 à 5 entraînements difficiles, forte dépense énergétique.' },
  { level: 'Très intense', desc: 'Entraînement quotidien ou biquotidien, profil pro.' },
  { level: 'Réel (Connecté)', desc: 'Bientôt disponible : Ajustement continu via montre connectée ou podomètre.' }
];

export default function NutritionSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [macroTargetsMatrix, setMacroTargetsMatrix] = useState<any>(null);

  // Editable fields
  const [activityLevel, setActivityLevel] = useState('Modéré');
  const [distribution, setDistribution] = useState({
    "Petit-déjeuner": 25,
    "Déjeuner": 35,
    "Collation": 10,
    "Dîner": 30
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('athlete_id', user.id)
      .maybeSingle();

    const { data: memoryData } = await supabase
      .from('ai_athlete_memory')
      .select('macro_targets')
      .eq('athlete_id', user.id)
      .maybeSingle();

    if (memoryData && memoryData.macro_targets) {
      setMacroTargetsMatrix(memoryData.macro_targets);
    }

    if (data) {
      setProfile(data);
      if (data.activity_level) setActivityLevel(data.activity_level);
      if (data.meal_distribution) setDistribution(data.meal_distribution);
    }
    setLoading(false);
  };

  const updateActivityLevel = async (level: string) => {
    setActivityLevel(level);
    setIsActivityModalVisible(false);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const updates: any = { activity_level: level };
      if (macroTargetsMatrix && macroTargetsMatrix[level]) {
        const activeTargets = macroTargetsMatrix[level];
        updates.target_calories = activeTargets.calories;
        updates.target_proteins = activeTargets.proteins;
        updates.target_carbs = activeTargets.carbs;
        updates.target_fats = activeTargets.fats;
      }
      await supabase.from('nutrition_profiles').update(updates).eq('athlete_id', user.id);
      setProfile({ ...profile, ...updates });
    }
  };

  const autoSaveDistribution = async (newDist: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('nutrition_profiles').update({
        meal_distribution: newDist,
        is_custom_distribution: true
      }).eq('athlete_id', user.id);
      setProfile((prev: any) => ({ ...prev, meal_distribution: newDist, is_custom_distribution: true }));
    }
  };

  const updateMealPercent = (meal: string, value: string) => {
    const num = parseInt(value) || 0;
    const newDist = { ...distribution, [meal]: num };
    setDistribution(newDist);
    
    const newSum = Object.values(newDist).reduce((a, b) => Number(a) + Number(b), 0);
    if (newSum === 100) {
      autoSaveDistribution(newDist);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const sumPercent = Object.values(distribution).reduce((a, b) => Number(a) + Number(b), 0);
  
  let currentTargets = {
    calories: profile?.target_calories || 2500,
    proteins: profile?.target_proteins || 0,
    carbs: profile?.target_carbs || 0,
    fats: profile?.target_fats || 0
  };

  if (macroTargetsMatrix && macroTargetsMatrix[activityLevel]) {
    currentTargets = macroTargetsMatrix[activityLevel];
  }

  const totalCalories = currentTargets.calories;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/nutrition');
            }
          }} style={styles.closeBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title="Paramètres Nutrition"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <Link href={{ pathname: '/nutrition/chat', params: { autoStart: 'true' } }} asChild>
            <TouchableOpacity activeOpacity={0.8} style={{ marginBottom: Layout.spacing.xl }}>
              <LinearGradient
                colors={['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: Layout.borderRadius.lg,
                  padding: Layout.spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  shadowColor: '#4F46E5',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 20, marginRight: Layout.spacing.md }}>
                  <MaterialIcons name="auto-awesome" size={24} color="#FFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFF', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>
                    {profile?.is_bilan_done ? "Refaire mon bilan" : "Faire mon bilan"}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Typography.sizes.sm, marginTop: 4 }}>Discutez avec Bioflow IA</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Link>
        </Animated.View>

        {!profile?.is_bilan_done ? (
          <Animated.View entering={FadeInUp.delay(200).springify()}>
            <Card style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
              <MaterialIcons name="lock" size={40} color={theme.surfaceSecondary} style={{ marginBottom: 16 }} />
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>En attente du bilan</Text>
              <Text style={{ color: theme.icon, fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                Effectuez votre bilan initial avec Bioflow pour débloquer vos objectifs et paramètres.
              </Text>
            </Card>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <Card style={styles.card} elevation="medium">
                <View style={styles.cardHeader}>
                  <MaterialIcons name="flag" size={24} color={theme.primary} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Objectifs Globaux</Text>
                </View>
                <View style={styles.goalsGrid}>
                  <View style={styles.goalBox}>
                    <Text style={[styles.goalLabel, { color: theme.icon }]}>Calories</Text>
                    <Text style={[styles.goalValue, { color: theme.primary }]}>{totalCalories} kcal</Text>
                  </View>
                  <View style={styles.goalBox}>
                    <Text style={[styles.goalLabel, { color: theme.icon }]}>Protéines</Text>
                    <Text style={[styles.goalValue, { color: theme.text }]}>{currentTargets.proteins}g</Text>
                  </View>
                  <View style={styles.goalBox}>
                    <Text style={[styles.goalLabel, { color: theme.icon }]}>Glucides</Text>
                    <Text style={[styles.goalValue, { color: theme.text }]}>{currentTargets.carbs}g</Text>
                  </View>
                  <View style={styles.goalBox}>
                    <Text style={[styles.goalLabel, { color: theme.icon }]}>Lipides</Text>
                    <Text style={[styles.goalValue, { color: theme.text }]}>{currentTargets.fats}g</Text>
                  </View>
                </View>
                <Text style={{ color: theme.icon, fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>
                  Ces objectifs s'adaptent dynamiquement au niveau d'activité choisi.
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(200).springify()}>
              <Card style={styles.card}>
                <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Layout.spacing.md }]}>Niveau d'activité</Text>
                
                <TouchableOpacity 
                  onPress={() => setIsActivityModalVisible(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.surfaceSecondary, padding: 16, borderRadius: 12 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {activityLevel === 'Réel (Connecté)' ? (
                      <MaterialIcons name="watch" size={24} color={theme.text} style={{ marginRight: 12 }} />
                    ) : (
                      <MaterialIcons name="directions-run" size={24} color={theme.text} style={{ marginRight: 12 }} />
                    )}
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{activityLevel}</Text>
                  </View>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.icon} />
                </TouchableOpacity>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>Répartition par repas</Text>
                  <Text style={{ color: sumPercent === 100 ? '#10B981' : theme.danger, fontWeight: 'bold' }}>Total: {sumPercent}%</Text>
                </View>
                
                {Object.keys(distribution).map((meal) => {
                  const mealCal = Math.round((totalCalories * (distribution[meal as keyof typeof distribution] || 0)) / 100);
                  return (
                    <View key={meal} style={styles.mealRow}>
                      <Text style={[styles.mealName, { color: theme.text }]}>{meal}</Text>
                      
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ color: theme.icon, fontSize: 14 }}>{mealCal} kcal</Text>
                        <View style={[styles.percentInputWrapper, { backgroundColor: theme.surfaceSecondary, borderColor: sumPercent === 100 ? theme.border : theme.danger }]}>
                          <TextInput
                            style={[styles.percentInput, { color: theme.text }]}
                            keyboardType="numeric"
                            value={String(distribution[meal as keyof typeof distribution])}
                            onChangeText={(v) => updateMealPercent(meal, v)}
                            maxLength={3}
                          />
                          <Text style={{ color: theme.icon, marginLeft: 4 }}>%</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(400).springify()} style={{ marginTop: 20, alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (user) generateAndShareReport(user.id);
                }}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, flexDirection: 'row', alignItems: 'center', shadowColor: theme.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
              >
                <FontAwesome5 name="file-pdf" size={18} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>Télécharger le rapport IA (PDF)</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
        
      </ScrollView>

      {/* Activity Selector Modal */}
      <Modal visible={isActivityModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsActivityModalVisible(false)} />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Niveau d'activité</Text>
              <TouchableOpacity onPress={() => setIsActivityModalVisible(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {ACTIVITY_LEVELS.map(item => {
                const isSelected = activityLevel === item.level;
                const isReel = item.level === 'Réel (Connecté)';
                return (
                  <TouchableOpacity 
                    key={item.level}
                    onPress={() => !isReel && updateActivityLevel(item.level)}
                    activeOpacity={isReel ? 1 : 0.7}
                    style={[
                      styles.activityChipRow, 
                      { 
                        backgroundColor: isSelected ? theme.primary : theme.surfaceSecondary,
                        borderColor: isSelected ? theme.primary : theme.border,
                        opacity: isReel ? 0.6 : 1,
                        marginBottom: 12
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {isReel ? (
                        <MaterialIcons name="watch" size={18} color={theme.text} style={{ marginRight: 8 }} />
                      ) : (
                        <MaterialIcons name="directions-run" size={18} color={isSelected ? '#FFF' : theme.text} style={{ marginRight: 8 }} />
                      )}
                      <Text style={{ color: isSelected ? '#FFF' : theme.text, fontSize: 14, fontWeight: 'bold' }}>{item.level}</Text>
                    </View>
                    <Text style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : theme.icon, fontSize: 12, marginTop: 4 }}>
                      {item.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { padding: Layout.spacing.xs },
  content: { padding: Layout.spacing.lg, paddingBottom: 100 },
  card: { marginBottom: Layout.spacing.lg, padding: Layout.spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Layout.spacing.md },
  cardTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Layout.spacing.sm },
  goalBox: { width: '48%', padding: Layout.spacing.md, backgroundColor: 'rgba(150,150,150,0.05)', borderRadius: 12, alignItems: 'center' },
  goalLabel: { fontSize: Typography.sizes.sm, marginBottom: 4 },
  goalValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Layout.spacing.md, marginTop: Layout.spacing.md },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  activityChipRow: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  mealName: { fontSize: 16, fontWeight: 'bold' },
  percentInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, width: 70, height: 40 },
  percentInput: { flex: 1, fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 400, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
});
