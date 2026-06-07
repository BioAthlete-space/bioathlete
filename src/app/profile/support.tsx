import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { FormRow } from '../../components/FormRow';

export default function SupportHubScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Aide et support" 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: Layout.spacing.sm, marginLeft: -Layout.spacing.sm }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Centre d'aide</Text>
        <Card style={styles.card} padding="none">
          <FormRow label="Foire Aux Questions (FAQ)" value="" type="select" icon="help-outline" onPress={() => router.push('/faq')} />
          <FormRow label="Besoin d'aide" value="" type="select" icon="support-agent" onPress={() => router.push('/support')} />
          <FormRow label="Signaler un problème" value="" type="select" icon="report-problem" onPress={() => router.push('/support')} isLast />
        </Card>
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
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xl, 
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: Layout.spacing.md,
    marginLeft: Layout.spacing.xs,
  },
  card: {
    marginBottom: Layout.spacing.xl,
  },
});
