import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { CustomButton } from '../../components/CustomButton';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const ACTIVITY_LEVELS = ['Sédentaire', 'Léger', 'Modéré', 'Intense', 'Très intense'];

export default function NutritionSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);

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

    if (data) {
      setProfile(data);
      if (data.activity_level) setActivityLevel(data.activity_level);
      if (data.meal_distribution) setDistribution(data.meal_distribution);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    // Validate that distribution sums to 100
    const sum = Object.values(distribution).reduce((a, b) => Number(a) + Number(b), 0);
    if (sum !== 100) {
      Alert.alert("Erreur", `La somme des pourcentages doit faire 100%. Actuellement: ${sum}%`);
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('nutrition_profiles').update({
        activity_level: activityLevel,
        meal_distribution: distribution,
        is_custom_distribution: true
      }).eq('athlete_id', user.id);
      
      // Update local state
      setProfile({ ...profile, activity_level: activityLevel, meal_distribution: distribution, is_custom_distribution: true });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const updateMealPercent = (meal: string, value: string) => {
    const num = parseInt(value) || 0;
    setDistribution(prev => ({ ...prev, [meal]: num }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const sumPercent = Object.values(distribution).reduce((a, b) => Number(a) + Number(b), 0);
  const totalCalories = profile?.target_calories || 2500;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title="Paramètres Nutrition"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <Animated.View entering={FadeInUp.delay(50).springify()}>
          <Link href="/nutrition/chat" asChild>
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
                  <Text style={{ color: '#FFF', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>Refaire mon bilan</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: Typography.sizes.sm, marginTop: 4 }}>Discutez avec Bioflow IA</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Link>
        </Animated.View>

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
                <Text style={[styles.goalValue, { color: theme.text }]}>{profile?.target_proteins || 0}g</Text>
              </View>
              <View style={styles.goalBox}>
                <Text style={[styles.goalLabel, { color: theme.icon }]}>Glucides</Text>
                <Text style={[styles.goalValue, { color: theme.text }]}>{profile?.target_carbs || 0}g</Text>
              </View>
              <View style={styles.goalBox}>
                <Text style={[styles.goalLabel, { color: theme.icon }]}>Lipides</Text>
                <Text style={[styles.goalValue, { color: theme.text }]}>{profile?.target_fats || 0}g</Text>
              </View>
            </View>
            <Text style={{ color: theme.icon, fontSize: 12, marginTop: 10, fontStyle: 'italic' }}>Ces objectifs de base sont fixés par le bilan IA.</Text>
          </Card>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Paramètres Personnalisables</Text>
          {!isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Éditer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => { setIsEditing(false); setDistribution(profile?.meal_distribution || distribution); setActivityLevel(profile?.activity_level || 'Modéré'); }}>
              <Text style={{ color: theme.danger, fontWeight: 'bold' }}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.text, marginBottom: Layout.spacing.md }]}>Niveau d'activité</Text>
            {isEditing ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ACTIVITY_LEVELS.map(level => (
                  <TouchableOpacity 
                    key={level}
                    onPress={() => setActivityLevel(level)}
                    style={[
                      styles.activityChip, 
                      { 
                        backgroundColor: activityLevel === level ? theme.primary : theme.surfaceSecondary,
                        borderColor: activityLevel === level ? theme.primary : theme.border
                      }
                    ]}
                  >
                    <Text style={{ color: activityLevel === level ? '#FFF' : theme.text, fontSize: 13, fontWeight: 'bold' }}>{level}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="directions-run" size={20} color={theme.icon} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{activityLevel}</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Répartition par repas</Text>
              {isEditing && (
                <Text style={{ color: sumPercent === 100 ? theme.primary : theme.danger, fontWeight: 'bold' }}>Total: {sumPercent}%</Text>
              )}
            </View>
            
            {Object.keys(distribution).map((meal) => {
              const mealCal = Math.round((totalCalories * (distribution[meal as keyof typeof distribution] || 0)) / 100);
              return (
                <View key={meal} style={styles.mealRow}>
                  <Text style={[styles.mealName, { color: theme.text }]}>{meal}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ color: theme.icon, fontSize: 14 }}>{mealCal} kcal</Text>
                    {isEditing ? (
                      <View style={[styles.percentInputWrapper, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}>
                        <TextInput
                          style={[styles.percentInput, { color: theme.text }]}
                          keyboardType="numeric"
                          value={String(distribution[meal as keyof typeof distribution])}
                          onChangeText={(v) => updateMealPercent(meal, v)}
                          maxLength={3}
                        />
                        <Text style={{ color: theme.icon, marginLeft: 4 }}>%</Text>
                      </View>
                    ) : (
                      <View style={[styles.percentBadge, { backgroundColor: theme.surfaceSecondary }]}>
                        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{distribution[meal as keyof typeof distribution]}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        </Animated.View>

        {isEditing && (
          <Animated.View entering={FadeInUp.springify()}>
            <CustomButton 
              title="Enregistrer les modifications" 
              onPress={handleSave} 
              isLoading={saving}
              style={{ marginTop: Layout.spacing.md }} 
            />
          </Animated.View>
        )}
        
      </ScrollView>
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
  activityChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  mealRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  mealName: { fontSize: 16, fontWeight: 'bold' },
  percentInputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, width: 70, height: 40 },
  percentInput: { flex: 1, fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  percentBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
});
