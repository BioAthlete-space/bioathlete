import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { SelectionModal } from '../../components/SelectionModal';
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
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [unitWeight, setUnitWeight] = useState(1);
  const [unitModalVisible, setUnitModalVisible] = useState(false);

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
      const qtyGrams = parseFloat(data.quantity_g) || 0;
      const dbUnit = data.unit || 'g';
      const dbOriginalQty = parseFloat(data.original_quantity);
      const originalQty = isNaN(dbOriginalQty) ? qtyGrams : dbOriginalQty;
      
      setSelectedUnit(dbUnit);
      setQuantityStr(originalQty.toString());
      setUnitWeight(originalQty > 0 ? qtyGrams / originalQty : 1);
      
      if (qtyGrams > 0) {
        setMacros100({
          calories: (parseFloat(data.calories) / qtyGrams) * 100,
          proteins: (parseFloat(data.proteins) / qtyGrams) * 100,
          carbs: (parseFloat(data.carbs) / qtyGrams) * 100,
          fats: (parseFloat(data.fats) / qtyGrams) * 100,
        });
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const parsedInput = parseFloat(quantityStr);
    if (isNaN(parsedInput) || parsedInput <= 0) {
      alert("Veuillez entrer une quantité valide.");
      return;
    }

    const qty = (selectedUnit === 'g' || selectedUnit === 'ml') ? parsedInput : parsedInput * unitWeight;

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
      quantity_g: qty, // this is final qty in grams
      calories: newCalories,
      proteins: newProteins,
      carbs: newCarbs,
      fats: newFats,
      unit: selectedUnit,
      original_quantity: parsedInput
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

  const handleDelete = async () => {
    setSaving(true);
    const { data: logData } = await supabase
      .from('nutrition_logs')
      .select('id, total_calories, total_proteins, total_carbs, total_fats')
      .eq('id', entry.log_id)
      .single();

    if (logData) {
      await supabase.from('nutrition_logs').update({
        total_calories: Math.max(0, parseFloat(logData.total_calories) - parseFloat(entry.calories)),
        total_proteins: Math.max(0, parseFloat(logData.total_proteins) - parseFloat(entry.proteins)),
        total_carbs: Math.max(0, parseFloat(logData.total_carbs) - parseFloat(entry.carbs)),
        total_fats: Math.max(0, parseFloat(logData.total_fats) - parseFloat(entry.fats))
      }).eq('id', entry.log_id);
    }

    await supabase.from('nutrition_entries').delete().eq('id', entry.id);
    setSaving(false);
    
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/nutrition/summary');
    }
  };

  const parsedInput = parseFloat(quantityStr) || 0;
  const currentQty = (selectedUnit === 'g' || selectedUnit === 'ml') ? parsedInput : parsedInput * unitWeight;
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
        title="Détails de l'aliment"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.springify()} style={{ flex: 1, justifyContent: 'center' }}>
          <Card style={[styles.foodDetailsCard, { marginBottom: Layout.spacing.xl }]} elevation="medium">
            <View style={{ marginBottom: Layout.spacing.lg }}>
              <Text style={[styles.selectedFoodName, { color: theme.text, textAlign: 'center', marginBottom: Layout.spacing.md }]}>{entry.food_name}</Text>
              
              {entry.is_ai_estimated && (
                <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'center' }}>
                  <Text style={{ color: '#8B5CF6', fontWeight: 'bold' }}>✨ Estimation IA</Text>
                </View>
              )}
            </View>

            <View style={[styles.macrosSummary, { backgroundColor: theme.surfaceSecondary }]}>
              {['Calories', 'Protéines', 'Glucides', 'Lipides'].map((macro, idx) => {
                let val = 0; let unit = 'g';
                if (idx === 0) { val = currentCals; unit = 'kcal'; }
                if (idx === 1) val = currentProts;
                if (idx === 2) val = currentCarbs;
                if (idx === 3) val = currentFats;
                return (
                  <View key={macro} style={styles.macroBox}>
                    <Text style={[styles.macroVal, { color: theme.text }]}>{Math.round(val)}{unit}</Text>
                    <Text style={[styles.macroLabel, { color: theme.icon }]}>{macro}</Text>
                  </View>
                );
              })}
            </View>

            <View style={[styles.quantityContainer, { justifyContent: 'center', gap: Layout.spacing.md, marginTop: Layout.spacing.md }]}>
              {saving ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Layout.spacing.md }}>
                  <TextInput
                    style={[styles.quantityInput, { color: theme.text, backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    keyboardType="numeric"
                    value={quantityStr}
                    onChangeText={setQuantityStr}
                    editable={!entry.is_ai_estimated}
                  />
                  <TouchableOpacity 
                    style={[styles.unitSelector, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
                    onPress={() => setUnitModalVisible(true)}
                  >
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>
                      {selectedUnit === 'g' ? 'g' : selectedUnit === 'ml' ? 'ml' : selectedUnit}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.icon} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {!entry.is_ai_estimated && (
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: Layout.spacing.xl }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>Mettre à jour</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', marginTop: entry.is_ai_estimated ? Layout.spacing.xl : Layout.spacing.md }]}
              onPress={handleDelete}
              disabled={saving}
            >
              <Text style={[styles.saveBtnText, { color: '#EF4444' }]}>Supprimer</Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>
      </ScrollView>

      <SelectionModal
        visible={unitModalVisible}
        onClose={() => setUnitModalVisible(false)}
        title="Unité"
        options={[
          ...(entry?.unit && entry.unit !== 'g' && entry.unit !== 'ml' ? [{ label: `${entry.unit.charAt(0).toUpperCase() + entry.unit.slice(1)}s`, value: entry.unit }] : []),
          { label: 'Grammes (g)', value: 'g' },
          { label: 'Millilitres (ml)', value: 'ml' }
        ]}
        onSelect={(val) => {
          setSelectedUnit(val);
          if (val === 'g' || val === 'ml') setQuantityStr('100');
          else setQuantityStr('1');
          setUnitModalVisible(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { padding: Layout.spacing.xs },
  content: { padding: Layout.spacing.lg, paddingBottom: 100, flexGrow: 1, justifyContent: 'center' },
  foodDetailsCard: { padding: Layout.spacing.lg },
  selectedFoodName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  macrosSummary: { flexDirection: 'row', gap: Layout.spacing.sm, padding: Layout.spacing.md, borderRadius: Layout.borderRadius.lg, marginBottom: Layout.spacing.xl },
  macroBox: { alignItems: 'center', flex: 1 },
  macroVal: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  macroLabel: { fontSize: Typography.sizes.xs, marginTop: 4 },
  quantityContainer: { flexDirection: 'row', alignItems: 'center' },
  quantityInput: { width: 100, height: 56, borderWidth: 1, borderRadius: Layout.borderRadius.md, textAlign: 'center', fontSize: Typography.sizes.lg, fontWeight: 'bold' },
  unitSelector: { borderWidth: 1, borderRadius: Layout.borderRadius.md, height: 56, paddingHorizontal: Layout.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  saveBtn: { padding: Layout.spacing.md, borderRadius: 25, alignItems: 'center' },
  saveBtnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }
});
