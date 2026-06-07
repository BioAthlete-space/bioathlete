import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import Animated, { FadeInUp, SlideInDown } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

export default function TextAIScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealType = params.meal as string;
  const targetDate = params.date as string;

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const analyzeText = async () => {
    if (inputText.trim().length < 3) return;
    
    setLoading(true);
    setAiResult(null);
    Keyboard.dismiss();

    try {
      const prompt = `Agis comme un expert nutritionniste. L'utilisateur décrit ce qu'il a mangé : "${inputText}".
Estime les portions et donne moi les informations nutritionnelles totales pour ce repas complet.
Renvoie UNIQUEMENT un JSON respectant EXACTEMENT ce format :
{ "food_name": "Description courte (ex: 3 oeufs et pain de mie)", "calories": 500, "proteins": 30, "carbs": 40, "fats": 20 }
Ne renvoie absolument aucun autre texte, pas de balises markdown, juste le JSON valide.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
          })
        }
      );

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (textOutput) {
        const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        
        if (parsed.food_name) {
          setAiResult(parsed);
        } else {
          throw new Error("JSON Invalide");
        }
      } else {
        throw new Error("Pas de réponse texte");
      }
    } catch (err) {
      console.warn("Erreur AI Texte:", err);
      alert("L'IA n'a pas pu analyser votre texte. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const mapMealTypeToDB = (frontendMeal: string) => {
    if (frontendMeal === 'Petit-déjeuner') return 'breakfast';
    if (frontendMeal === 'Déjeuner') return 'lunch';
    if (frontendMeal === 'Collation') return 'snack';
    if (frontendMeal === 'Dîner') return 'dinner';
    return 'snack';
  };

  const confirmAiResult = async () => {
    if (!aiResult) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let logId;
      const { data: existingLog } = await supabase
        .from('nutrition_logs')
        .select('id, total_calories, total_proteins, total_carbs, total_fats')
        .eq('user_id', user.id)
        .eq('log_date', targetDate)
        .maybeSingle();

      const addedCals = Math.round(aiResult.calories);
      const addedProts = Math.round(aiResult.proteins);
      const addedCarbs = Math.round(aiResult.carbs);
      const addedFats = Math.round(aiResult.fats);

      if (existingLog) {
        logId = existingLog.id;
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

      if (logId) {
        await supabase.from('nutrition_entries').insert({
          log_id: logId,
          food_name: aiResult.food_name,
          quantity_g: 100, // Conceptuel, la portion correspond au total
          calories: addedCals,
          proteins: addedProts,
          carbs: addedCarbs,
          fats: addedFats,
          meal_type: mapMealTypeToDB(mealType),
          is_ai_estimated: true
        });
      }

      // Retourner au résumé du repas spécifique pour voir l'ajout
      router.replace({ pathname: '/nutrition/summary', params: { meal: mealType, date: targetDate } });
    } catch (error) {
      console.error("Erreur d'enregistrement:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title="Texte Naturel"
      />

      <ScrollView 
        contentContainerStyle={styles.content} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.delay(100).springify()}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <MaterialIcons name="chat" size={48} color="#10B981" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Décrivez votre repas</Text>
            <Text style={[styles.subtitle, { color: theme.icon }]}>
              Soyez le plus précis possible sur les quantités pour une meilleure estimation.
            </Text>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
            multiline
            placeholder="Ex: J'ai mangé 3 oeufs brouillés avec 2 tranches de pain de mie beurrées..."
            placeholderTextColor={theme.icon}
            value={inputText}
            onChangeText={(text) => {
              setInputText(text);
              if (aiResult) setAiResult(null); // Clear result if user starts typing again
            }}
          />

          {!aiResult ? (
            <TouchableOpacity 
              style={[styles.analyzeBtn, { backgroundColor: theme.primary }, (inputText.trim().length < 3 || loading) && { opacity: 0.5 }]}
              onPress={analyzeText}
              disabled={inputText.trim().length < 3 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.analyzeBtnText}>Analyser mon texte</Text>
              )}
            </TouchableOpacity>
          ) : (
            <Animated.View entering={SlideInDown.springify()}>
              <Card style={{ padding: Layout.spacing.lg, marginBottom: Layout.spacing.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.md }}>
                  <MaterialIcons name="auto-awesome" size={24} color="#8B5CF6" />
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold', marginLeft: 8 }}>Ce que l'IA a compris :</Text>
                </View>
                
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: Layout.spacing.md }}>
                  {aiResult.food_name}
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.lg }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>{aiResult.calories}</Text>
                    <Text style={{ color: theme.icon, fontSize: 12 }}>kcal</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#3B82F6', fontWeight: 'bold', fontSize: 16 }}>{aiResult.proteins}g</Text>
                    <Text style={{ color: theme.icon, fontSize: 12 }}>Protéines</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#F59E0B', fontWeight: 'bold', fontSize: 16 }}>{aiResult.carbs}g</Text>
                    <Text style={{ color: theme.icon, fontSize: 12 }}>Glucides</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 16 }}>{aiResult.fats}g</Text>
                    <Text style={{ color: theme.icon, fontSize: 12 }}>Lipides</Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.analyzeBtn, { backgroundColor: theme.primary, marginBottom: Layout.spacing.md }]}
                  onPress={confirmAiResult}
                >
                  <Text style={styles.analyzeBtnText}>Valider et continuer</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{ alignItems: 'center', padding: Layout.spacing.sm }}
                  onPress={() => setAiResult(null)}
                >
                  <Text style={{ color: theme.icon }}>Je veux rectifier mon texte</Text>
                </TouchableOpacity>
              </Card>
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  backBtn: {
    padding: Layout.spacing.xs,
  },
  content: {
    flex: 1,
    padding: Layout.spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
    marginTop: Layout.spacing.lg,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Layout.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  input: {
    height: 150,
    borderWidth: 1,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.md,
    fontSize: Typography.sizes.lg,
    textAlignVertical: 'top',
    marginBottom: Layout.spacing.xl,
  },
  analyzeBtn: {
    height: 56,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeBtnText: {
    color: '#FFF',
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  }
});
