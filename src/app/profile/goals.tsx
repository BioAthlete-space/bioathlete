import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function GoalsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>({ weightkg: '--' });
  const [nutritionData, setNutritionData] = useState<any>({
    ultimate_goal_desc: 'Non défini',
    ultimate_weight_goal: null,
    target_calories: '--',
    target_proteins: '--',
    target_carbs: '--',
    target_fats: '--'
  });

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: pData } = await supabase.from('profiles').select('weightkg').eq('id', user.id).maybeSingle();
      if (pData) setProfileData(pData);

      const { data: nData } = await supabase.from('nutrition_profiles').select('*').eq('athlete_id', user.id).maybeSingle();
      if (nData) setNutritionData(nData);

      setLoading(false);
    }
    fetchData();
  }, []);

  const sections = [
    {
      title: 'Paramètres métaboliques',
      items: [
        { label: 'Objectif', icon: 'track-changes', rightText: nutritionData.ultimate_goal_desc || 'Général', clickable: true },
        { label: 'Poids de départ', icon: 'monitor-weight', rightText: profileData.weightkg !== '--' ? `${parseFloat(profileData.weightkg).toFixed(2)} kg` : '--', clickable: true },
        { label: 'Poids cible', icon: 'flag', rightText: nutritionData.ultimate_weight_goal ? `${parseFloat(nutritionData.ultimate_weight_goal).toFixed(2)} kg` : 'À définir', clickable: true },
        { label: 'Prochain Point IA', icon: 'update', rightText: nutritionData.next_checkin_date ? new Date(nutritionData.next_checkin_date).toLocaleDateString('fr-FR') : '--', clickable: true },
      ],
    },
    {
      title: 'Calculs',
      items: [
        { label: 'Objectif calorique journalier', icon: 'local-fire-department', rightText: `${nutritionData.target_calories} kcal`, clickable: false, highlighted: true },
        { label: 'Objectif nutritionnel', icon: 'pie-chart', rightText: `${nutritionData.target_proteins}g P / ${nutritionData.target_carbs}g G / ${nutritionData.target_fats}g L`, clickable: true },
      ],
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Mes Objectifs" 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: Layout.spacing.sm, marginLeft: -Layout.spacing.sm }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.description, { color: theme.icon }]}>
          Ces paramètres servent à calculer vos besoins caloriques et nutritionnels optimaux. Gérés et mis à jour automatiquement par Bioflow IA.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          sections.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>{section.title}</Text>
              <View style={[styles.sectionContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {section.items.map((item, itemIdx) => (
                  <View key={itemIdx}>
                    <TouchableOpacity 
                      style={[styles.itemRow, item.highlighted && { backgroundColor: theme.surfaceSecondary }]} 
                      disabled={!item.clickable}
                    >
                      <View style={styles.itemLeft}>
                        <MaterialIcons name={item.icon as any} size={24} color={item.highlighted ? theme.primary : theme.icon} style={styles.itemIcon} />
                        <Text style={[styles.itemLabel, { color: item.highlighted ? theme.text : theme.text, fontWeight: item.highlighted ? 'bold' : '500' }]}>{item.label}</Text>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={[styles.itemRightText, { color: item.highlighted ? theme.primary : theme.icon }]}>{item.rightText}</Text>
                        {item.clickable && <MaterialIcons name="chevron-right" size={24} color={theme.icon} />}
                      </View>
                    </TouchableOpacity>
                    {itemIdx < section.items.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.xxl,
  },
  description: {
    fontSize: Typography.sizes.sm,
    marginBottom: Layout.spacing.xl,
    lineHeight: 20,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    marginBottom: Layout.spacing.sm,
    marginLeft: Layout.spacing.sm,
  },
  sectionContainer: {
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: Layout.spacing.md,
  },
  itemLabel: {
    fontSize: Typography.sizes.md,
    flex: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRightText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    marginRight: 4,
  },
  divider: {
    height: 1,
    marginLeft: 56, // Align with text
  },
});
