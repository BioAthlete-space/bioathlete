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

export default function LegalHubScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Mentions légales & Confidentialité" 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ padding: Layout.spacing.sm, marginLeft: -Layout.spacing.sm }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Documents légaux</Text>
        <Card style={styles.card} padding="none">
          <FormRow label="Conditions Générales d'Utilisation" value="" type="select" icon="description" onPress={() => router.push('/cgu')} />
          <FormRow label="Mentions légales" value="" type="select" icon="gavel" onPress={() => router.push('/mentions-legales')} />
          <FormRow label="Politique de confidentialité" value="" type="select" icon="privacy-tip" onPress={() => router.push('/confidentialite')} isLast />
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
