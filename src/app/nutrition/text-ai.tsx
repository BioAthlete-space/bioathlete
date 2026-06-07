import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { MaterialIcons } from '@expo/vector-icons';
import { Header } from '../../components/Header';
import Animated, { FadeInUp } from 'react-native-reanimated';

export default function TextAIScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mealType = params.meal as string;
  const targetDate = params.date as string;

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const analyzeText = async () => {
    if (inputText.trim().length < 3) return;
    
    setLoading(true);
    Keyboard.dismiss();

    try {
      const prompt = `Agis comme un expert nutritionniste. L'utilisateur décrit ce qu'il a mangé : "${inputText}".
Estime les portions et donne moi les informations nutritionnelles totales pour ce repas complet.
Renvoie UNIQUEMENT un JSON respectant EXACTEMENT ce format :
{ "food_name": "Description courte (ex: 3 oeufs et pain de mie)", "calories": 500, "proteins": 30, "carbs": 40, "fats": 20 }
Ne renvoie absolument aucun autre texte, pas de balises markdown, juste le JSON valide.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`,
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
          // On redirige vers confirm-add en passant 100g par défaut (on utilise 100g comme "1 repas complet")
          router.push({
            pathname: '/nutrition/confirm-add',
            params: {
              food_name: parsed.food_name,
              calories_100g: parsed.calories.toString(),
              proteins_100g: parsed.proteins.toString(),
              carbs_100g: parsed.carbs.toString(),
              fats_100g: parsed.fats.toString(),
              meal: mealType,
              date: targetDate
            }
          });
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <Header 
            leftContent={
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={28} color={theme.text} />
              </TouchableOpacity>
            }
            title="Texte Naturel"
          />

          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.content}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <MaterialIcons name="chat" size={48} color="#10B981" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Décrivez votre repas</Text>
              <Text style={[styles.subtitle, { color: theme.icon }]}>
                Exemple : "J'ai mangé 3 oeufs brouillés avec 2 tranches de pain de mie beurrées."
              </Text>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border }]}
              multiline
              placeholder="Que venez-vous de manger ?"
              placeholderTextColor={theme.icon}
              value={inputText}
              onChangeText={setInputText}
              autoFocus
            />

            <TouchableOpacity 
              style={[styles.analyzeBtn, { backgroundColor: theme.primary }, (inputText.trim().length < 3 || loading) && { opacity: 0.5 }]}
              onPress={analyzeText}
              disabled={inputText.trim().length < 3 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.analyzeBtnText}>Estimer les macros</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>
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
