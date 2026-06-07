import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

export default function ConfirmAddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const foodName = params.food_name as string || 'Aliment inconnu';
  const calories100 = parseFloat(params.calories_100g as string) || 0;
  const proteins100 = parseFloat(params.proteins_100g as string) || 0;
  const carbs100 = parseFloat(params.carbs_100g as string) || 0;
  const fats100 = parseFloat(params.fats_100g as string) || 0;
  const mealType = params.meal as string || 'Petit-déjeuner';
  const targetDate = params.date as string || new Date().toISOString().split('T')[0];

  // Détection de l'unité par défaut (liquide -> ml)
  const isLiquid = /eau|jus|lait|boisson|huile|sirop|café|thé|soupe/i.test(foodName);
  const defaultUnit = isLiquid ? 'ml' : 'g';

  const [unit, setUnit] = useState(defaultUnit);
  const [quantityStr, setQuantityStr] = useState(unit === 'portion' ? '1' : '100');
  const [loading, setLoading] = useState(false);

  // Champs éditables manuellement
  const [manualCals, setManualCals] = useState('');
  const [manualProts, setManualProts] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFats, setManualFats] = useState('');

  // Mise à jour automatique des macros quand la quantité ou l'unité change
  useEffect(() => {
    const qty = parseFloat(quantityStr) || 0;
    // Si portion, on suppose qu'une portion fait "1 fois" les valeurs pour 100g (ou 1 fois la fiche)
    const multiplier = unit === 'portion' ? qty : qty / 100;
    
    setManualCals(Math.round(calories100 * multiplier).toString());
    setManualProts(Math.round(proteins100 * multiplier).toString());
    setManualCarbs(Math.round(carbs100 * multiplier).toString());
    setManualFats(Math.round(fats100 * multiplier).toString());
  }, [quantityStr, unit, calories100, proteins100, carbs100, fats100]);

  const mapMealTypeToDB = (frontendType: string) => {
    if (frontendType === 'Petit-déjeuner') return 'breakfast';
    if (frontendType === 'Déjeuner') return 'lunch';
    if (frontendType === 'Collation') return 'snack';
    if (frontendType === 'Dîner') return 'dinner';
    return 'snack';
  };

  const handleSave = async () => {
    const qty = parseFloat(quantityStr) || 0;
    const finalCals = parseFloat(manualCals) || 0;
    const finalProts = parseFloat(manualProts) || 0;
    const finalCarbs = parseFloat(manualCarbs) || 0;
    const finalFats = parseFloat(manualFats) || 0;

    if (qty <= 0) {
      alert("Veuillez entrer une quantité valide.");
      return;
    }

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

      if (existingLog) {
        logId = existingLog.id;
        await supabase
          .from('nutrition_logs')
          .update({
            total_calories: (existingLog.total_calories || 0) + finalCals,
            total_proteins: (existingLog.total_proteins || 0) + finalProts,
            total_carbs: (existingLog.total_carbs || 0) + finalCarbs,
            total_fats: (existingLog.total_fats || 0) + finalFats
          })
          .eq('id', logId);
      } else {
        const { data: newLog, error: logError } = await supabase
          .from('nutrition_logs')
          .insert({
            user_id: user.id,
            log_date: targetDate,
            total_calories: finalCals,
            total_proteins: finalProts,
            total_carbs: finalCarbs,
            total_fats: finalFats
          })
          .select('id')
          .single();

        if (logError) throw logError;
        if (newLog) logId = newLog.id;
      }

      if (logId) {
        await supabase.from('nutrition_entries').insert({
          log_id: logId,
          food_name: foodName,
          portion_g: unit === 'portion' ? finalCals : qty, // On sauvegarde la portion
          calories: finalCals,
          proteins: finalProts,
          carbs: finalCarbs,
          fats: finalFats,
          meal_type: mapMealTypeToDB(mealType)
        });
      }

      router.push({ pathname: '/nutrition/summary', params: { meal: mealType, date: targetDate } });
    } catch (error) {
      console.error("Erreur d'enregistrement:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/nutrition');
            }
          }} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title="Validation"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.springify()}>
          <Card style={styles.card}>
            <View style={styles.headerRow}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.surfaceSecondary }]}>
                <MaterialIcons name="fastfood" size={32} color={theme.primary} />
              </View>
              <View style={styles.headerTexts}>
                <Text style={[styles.foodName, { color: theme.text }]}>{foodName}</Text>
                <Text style={[styles.mealLabel, { color: theme.icon }]}>Pour: {mealType}</Text>
              </View>
            </View>

            <View style={styles.unitSelector}>
              {['g', 'ml', 'portion'].map((u) => (
                <TouchableOpacity 
                  key={u}
                  style={[
                    styles.unitBtn, 
                    { backgroundColor: unit === u ? theme.primary : theme.surfaceSecondary }
                  ]}
                  onPress={() => {
                    setUnit(u);
                    setQuantityStr(u === 'portion' ? '1' : '100');
                  }}
                >
                  <Text style={[styles.unitBtnText, { color: unit === u ? '#FFF' : theme.text }]}>
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.quantitySection}>
              <Text style={[styles.label, { color: theme.text }]}>Quantité</Text>
              <View style={styles.qtyInputContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text, borderColor: theme.border, flex: 1 }]}
                  value={quantityStr}
                  onChangeText={setQuantityStr}
                  keyboardType="numeric"
                  placeholder="Ex: 100"
                  placeholderTextColor={theme.icon}
                />
                <Text style={[styles.qtyInputLabel, { color: theme.icon }]}>{unit}</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: theme.text, marginTop: Layout.spacing.md }]}>Ajustement Manuel (Macros)</Text>
            <View style={[styles.macrosContainer, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: theme.icon }]}>kcal</Text>
                <TextInput
                  style={[styles.macroInput, { color: theme.primary, borderBottomColor: theme.primary }]}
                  value={manualCals}
                  onChangeText={setManualCals}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: theme.icon }]}>Prot (g)</Text>
                <TextInput
                  style={[styles.macroInput, { color: '#3B82F6', borderBottomColor: '#3B82F6' }]}
                  value={manualProts}
                  onChangeText={setManualProts}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: theme.icon }]}>Gluc (g)</Text>
                <TextInput
                  style={[styles.macroInput, { color: '#F59E0B', borderBottomColor: '#F59E0B' }]}
                  value={manualCarbs}
                  onChangeText={setManualCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={[styles.macroLabel, { color: theme.icon }]}>Lip (g)</Text>
                <TextInput
                  style={[styles.macroInput, { color: '#EF4444', borderBottomColor: '#EF4444' }]}
                  value={manualFats}
                  onChangeText={setManualFats}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </Card>

          <TouchableOpacity 
            style={[styles.saveBtn, { backgroundColor: theme.primary }, loading && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>Valider l'ajout</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: Layout.spacing.xs },
  content: { padding: Layout.spacing.lg, paddingBottom: 100 },
  card: { padding: Layout.spacing.lg, marginBottom: Layout.spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginRight: Layout.spacing.md },
  headerTexts: { flex: 1 },
  foodName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, marginBottom: 4 },
  mealLabel: { fontSize: Typography.sizes.sm },
  
  unitSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Layout.spacing.lg },
  unitBtn: { flex: 1, paddingVertical: 10, marginHorizontal: 4, borderRadius: Layout.borderRadius.md, alignItems: 'center' },
  unitBtnText: { fontWeight: 'bold', fontSize: Typography.sizes.md },

  quantitySection: { marginBottom: Layout.spacing.sm },
  label: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, marginBottom: Layout.spacing.sm },
  qtyInputContainer: { flexDirection: 'row', alignItems: 'center' },
  input: { height: 56, borderWidth: 1, borderRadius: Layout.borderRadius.md, paddingHorizontal: Layout.spacing.md, fontSize: Typography.sizes.lg, fontWeight: 'bold' },
  qtyInputLabel: { position: 'absolute', right: 16, fontSize: Typography.sizes.lg, fontWeight: 'bold' },

  macrosContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: Layout.spacing.md, borderRadius: Layout.borderRadius.md, borderWidth: 1, marginTop: Layout.spacing.xs },
  macroItem: { alignItems: 'center', flex: 1 },
  macroInput: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, textAlign: 'center', borderBottomWidth: 1, minWidth: 40, paddingBottom: 2 },
  macroLabel: { fontSize: Typography.sizes.xs, marginBottom: 4 },
  macroDivider: { width: 1, backgroundColor: 'rgba(150, 150, 150, 0.2)' },
  
  saveBtn: { height: 56, borderRadius: Layout.borderRadius.md, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  saveBtnText: { color: '#FFF', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }
});
