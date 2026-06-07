import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';

export default function EditEntryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const entryId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entry, setEntry] = useState<any>(null);
  const [quantityStr, setQuantityStr] = useState('');

  // Values per 100g (calculated from DB)
  const [macros100, setMacros100] = useState({ calories: 0, proteins: 0, carbs: 0, fats: 0 });

  useEffect(() => {
    fetchEntry();
  }, [entryId]);

  const fetchEntry = async () => {
    if (!entryId) return;
    const { data, error } = await supabase
      .from('nutrition_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (data && !error) {
      setEntry(data);
      const qty = parseFloat(data.quantity_g) || 0;
      setQuantityStr(qty.toString());
      
      if (qty > 0) {
        setMacros100({
          calories: (parseFloat(data.calories) / qty) * 100,
          proteins: (parseFloat(data.proteins) / qty) * 100,
          carbs: (parseFloat(data.carbs) / qty) * 100,
          fats: (parseFloat(data.fats) / qty) * 100,
        });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const qty = parseFloat(quantityStr);
    if (isNaN(qty) || qty <= 0) {
      alert("Veuillez entrer une quantité valide.");
      return;
    }

    setSaving(true);
    
    // Calculate new total macros
    const newCalories = (macros100.calories * qty) / 100;
    const newProteins = (macros100.proteins * qty) / 100;
    const newCarbs = (macros100.carbs * qty) / 100;
    const newFats = (macros100.fats * qty) / 100;

    // We also need to update the daily log totals.
    // Easiest is to update the entry, then call a database function or fetch the log, subtract old, add new.
    const { data: logData } = await supabase
      .from('nutrition_logs')
      .select('id, total_calories, total_proteins, total_carbs, total_fats')
      .eq('id', entry.log_id)
      .single();

    if (logData) {
      const diffCalories = newCalories - parseFloat(entry.calories);
      const diffProteins = newProteins - parseFloat(entry.proteins);
      const diffCarbs = newCarbs - parseFloat(entry.carbs);
      const diffFats = newFats - parseFloat(entry.fats);

      await supabase.from('nutrition_logs').update({
        total_calories: parseFloat(logData.total_calories) + diffCalories,
        total_proteins: parseFloat(logData.total_proteins) + diffProteins,
        total_carbs: parseFloat(logData.total_carbs) + diffCarbs,
        total_fats: parseFloat(logData.total_fats) + diffFats
      }).eq('id', entry.log_id);
    }

    // Update the entry itself
    await supabase.from('nutrition_entries').update({
      quantity_g: qty,
      calories: newCalories,
      proteins: newProteins,
      carbs: newCarbs,
      fats: newFats
    }).eq('id', entry.id);

    setSaving(false);
    
    // Go back and refresh
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/nutrition/summary');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Aliment introuvable.</Text>
      </View>
    );
  }

  const currentQty = parseFloat(quantityStr) || 0;
  const currentCals = Math.round((macros100.calories * currentQty) / 100);
  const currentProts = Math.round((macros100.proteins * currentQty) / 100);
  const currentCarbs = Math.round((macros100.carbs * currentQty) / 100);
  const currentFats = Math.round((macros100.fats * currentQty) / 100);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title="Éditer l'aliment"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInUp.springify()}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrapper, { backgroundColor: theme.surfaceSecondary }]}>
              <MaterialIcons name="restaurant" size={32} color={theme.primary} />
            </View>
            <View style={styles.headerTexts}>
              <Text style={[styles.foodName, { color: theme.text }]}>{entry.food_name}</Text>
            </View>
          </View>

          {!entry.is_ai_estimated && (
            <Card style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Quantité consommée (g/ml)</Text>
              <View style={[styles.qtyInputContainer, { borderColor: theme.border, backgroundColor: theme.surfaceSecondary }]}>
                <TextInput
                  style={[styles.input, { color: theme.primary }]}
                  value={quantityStr}
                  onChangeText={setQuantityStr}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </Card>
          )}

          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {entry.is_ai_estimated ? "Estimation nutritionnelle" : `Pour ${currentQty || 0}g`}
            </Text>
            <View style={styles.macrosGrid}>
              <View style={[styles.macroBox, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                <Text style={[styles.macroValue, { color: theme.primary }]}>{currentCals}</Text>
                <Text style={[styles.macroLabel, { color: theme.primary }]}>kcal</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Text style={[styles.macroValue, { color: '#3B82F6' }]}>{currentProts}g</Text>
                <Text style={[styles.macroLabel, { color: '#3B82F6' }]}>Protéines</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Text style={[styles.macroValue, { color: '#F59E0B' }]}>{currentCarbs}g</Text>
                <Text style={[styles.macroLabel, { color: '#F59E0B' }]}>Glucides</Text>
              </View>
              <View style={[styles.macroBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Text style={[styles.macroValue, { color: '#EF4444' }]}>{currentFats}g</Text>
                <Text style={[styles.macroLabel, { color: '#EF4444' }]}>Lipides</Text>
              </View>
            </View>
          </Card>

          {!entry.is_ai_estimated && (
            <Card style={[styles.card, { backgroundColor: theme.surfaceSecondary, borderWidth: 0 }]} elevation="none">
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 14 }]}>Valeurs pour 100g</Text>
              <View style={styles.valuesList}>
                <View style={styles.valueRow}>
                  <Text style={{ color: theme.icon }}>Énergie</Text>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{Math.round(macros100.calories)} kcal</Text>
                </View>
                <View style={styles.valueRow}>
                  <Text style={{ color: theme.icon }}>Protéines</Text>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{Math.round(macros100.proteins)} g</Text>
                </View>
                <View style={styles.valueRow}>
                  <Text style={{ color: theme.icon }}>Glucides</Text>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{Math.round(macros100.carbs)} g</Text>
                </View>
                <View style={styles.valueRow}>
                  <Text style={{ color: theme.icon }}>Lipides</Text>
                  <Text style={{ color: theme.text, fontWeight: 'bold' }}>{Math.round(macros100.fats)} g</Text>
                </View>
              </View>
            </Card>
          )}

          {!entry.is_ai_estimated && (
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: theme.primary }, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: Layout.spacing.xs },
  content: { padding: Layout.spacing.lg, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.xl },
  iconWrapper: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: Layout.spacing.md },
  headerTexts: { flex: 1 },
  foodName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  card: { padding: Layout.spacing.lg, marginBottom: Layout.spacing.lg },
  sectionTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, marginBottom: Layout.spacing.md },
  qtyInputContainer: { borderWidth: 1, borderRadius: Layout.borderRadius.md, height: 64 },
  input: { flex: 1, fontSize: 32, fontWeight: 'bold', textAlign: 'center' },
  macrosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  macroBox: { width: '48%', padding: Layout.spacing.md, borderRadius: 12, alignItems: 'center' },
  macroValue: { fontSize: Typography.sizes.xl, fontWeight: 'bold', marginBottom: 2 },
  macroLabel: { fontSize: Typography.sizes.xs, fontWeight: 'bold', textTransform: 'uppercase' },
  valuesList: { gap: 8 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  saveBtn: { height: 56, borderRadius: Layout.borderRadius.md, alignItems: 'center', justifyContent: 'center', marginTop: Layout.spacing.md },
  saveBtnText: { color: '#FFF', fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }
});
