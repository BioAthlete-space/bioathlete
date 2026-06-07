import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useThemeColor';
import { Layout } from '../../../constants/Layout';
import { Header } from '../../../components/Header';
import { Card } from '../../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../../lib/supabase';
import { AnimatedProgressBar } from '../../../components/AnimatedProgressBar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

const GoalBar = ({ label, current, max, color, unit = 'g' }: any) => {
  const theme = useTheme();
  return (
    <View style={styles.goalBarContainer}>
      <View style={styles.goalBarHeader}>
        <Text style={[styles.goalLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.goalValue, { color: theme.text }]}>
          {Math.round(current)} {unit} / {Math.round(max)} {unit}
        </Text>
      </View>
      <AnimatedProgressBar 
        current={current} 
        max={max} 
        color={color} 
        height={8} 
        delay={100} 
      />
    </View>
  );
};

export default function MealDetailScreen() {
  const { type, date } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);
  
  const [mealPhoto, setMealPhoto] = useState<string | null>(null);
  const [mealData, setMealData] = useState({ calories: 0, proteins: 0, carbs: 0, fats: 0 });
  const [dailyGoals, setDailyGoals] = useState({ calories: 2500, proteins: 120, carbs: 300, fats: 80 });

  const mapMealTypeToDB = (t: string) => {
    if (t === 'Petit-déjeuner') return 'breakfast';
    if (t === 'Déjeuner') return 'lunch';
    if (t === 'Collation') return 'snack';
    if (t === 'Dîner') return 'dinner';
    return 'snack';
  };

  const loadData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // Goals
    const { data: profile } = await supabase
      .from('nutrition_profiles')
      .select('target_calories, target_proteins, target_carbs, target_fats')
      .eq('athlete_id', user.id)
      .maybeSingle();

    if (profile) {
      // Pour les repas, on affiche par rapport à un objectif journalier estimé ou fractionné ?
      // Yazio / MFP affiche par rapport à la journée ou un objectif de repas (souvent 1/3 ou 1/4).
      // On va juste diviser par 3.5 pour donner un objectif visuel au repas.
      setDailyGoals({
        calories: (profile.target_calories || 2500) / 3.5,
        proteins: (profile.target_proteins || 120) / 3.5,
        carbs: (profile.target_carbs || 300) / 3.5,
        fats: (profile.target_fats || 80) / 3.5,
      });
    }

    // Log & entries
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { data: logData } = await supabase
      .from('nutrition_logs')
      .select('id, meal_photos')
      .eq('user_id', user.id)
      .eq('log_date', targetDate)
      .maybeSingle();

    if (logData) {
      setLogId(logData.id);
      
      const photos = logData.meal_photos || {};
      if (photos[type as string]) {
        setMealPhoto(photos[type as string]);
      }

      const { data: entries } = await supabase
        .from('nutrition_entries')
        .select('calories, proteins, carbs, fats')
        .eq('log_id', logData.id)
        .eq('meal_type', mapMealTypeToDB(type as string));

      if (entries) {
        const aggregated = entries.reduce((acc, curr) => ({
          calories: acc.calories + Number(curr.calories || 0),
          proteins: acc.proteins + Number(curr.proteins || 0),
          carbs: acc.carbs + Number(curr.carbs || 0),
          fats: acc.fats + Number(curr.fats || 0),
        }), { calories: 0, proteins: 0, carbs: 0, fats: 0 });
        setMealData(aggregated);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [type, date]);

  const handleTakeMealPhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        setUploading(true);
        const base64 = result.assets[0].base64;
        const ext = result.assets[0].uri.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}_meal_${mapMealTypeToDB(type as string)}.${ext}`;

        const { data, error } = await supabase.storage
          .from('meal-photos')
          .upload(fileName, decode(base64), { contentType: `image/${ext}` });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('meal-photos')
          .getPublicUrl(fileName);

        // Update DB
        if (logId) {
          const { data: currentLog } = await supabase.from('nutrition_logs').select('meal_photos').eq('id', logId).single();
          const currentPhotos = currentLog?.meal_photos || {};
          currentPhotos[type as string] = publicUrl;
          
          await supabase.from('nutrition_logs').update({ meal_photos: currentPhotos }).eq('id', logId);
        }

        setMealPhoto(publicUrl);
        setUploading(false);
      }
    } catch (error) {
      console.warn("Erreur photo de repas:", error);
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title={type as string}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section Photo du Repas */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <TouchableOpacity 
            style={[styles.photoCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]} 
            onPress={handleTakeMealPhoto}
            disabled={uploading}
          >
            {mealPhoto ? (
              <Image source={{ uri: mealPhoto }} style={styles.mealImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                {uploading ? (
                  <ActivityIndicator color={theme.primary} size="large" />
                ) : (
                  <>
                    <MaterialIcons name="add-a-photo" size={40} color={theme.icon} />
                    <Text style={[styles.photoText, { color: theme.icon }]}>Associer une photo au repas</Text>
                  </>
                )}
              </View>
            )}
            {mealPhoto && (
              <View style={styles.editPhotoBadge}>
                <MaterialIcons name="edit" size={20} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Section Macros du Repas */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Card style={styles.card} elevation="medium">
            <View style={styles.cardHeader}>
              <MaterialIcons name="pie-chart" size={24} color={theme.icon} />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Nutrition du repas</Text>
            </View>
            
            <View style={styles.barsContainer}>
              <GoalBar label="Calories" current={mealData.calories} max={dailyGoals.calories} color={theme.primary} unit="kcal" />
              <GoalBar label="Protéines" current={mealData.proteins} max={dailyGoals.proteins} color="#3B82F6" />
              <GoalBar label="Glucides" current={mealData.carbs} max={dailyGoals.carbs} color="#F59E0B" />
              <GoalBar label="Lipides" current={mealData.fats} max={dailyGoals.fats} color="#EF4444" />
            </View>
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Footer Bouton Ajouter */}
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push({ pathname: '/nutrition/add', params: { meal: type, date: date } })}
        >
          <MaterialIcons name="add" size={24} color="#FFF" />
          <Text style={styles.addButtonText}>Ajouter au repas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: 100,
  },
  iconBtn: {
    padding: Layout.spacing.xs,
  },
  photoCard: {
    height: 200,
    borderRadius: Layout.borderRadius.xl,
    overflow: 'hidden',
    marginBottom: Layout.spacing.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mealImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoText: {
    marginTop: Layout.spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
  editPhotoBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  card: {
    borderRadius: Layout.borderRadius.xl,
    padding: Layout.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: Layout.spacing.sm,
  },
  barsContainer: {
    gap: Layout.spacing.lg,
  },
  goalBarContainer: {},
  goalBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Layout.spacing.xs,
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Layout.spacing.lg,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: Layout.borderRadius.xl,
    gap: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
