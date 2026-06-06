import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useThemeColor';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';
import { Header } from '../components/Header';
import { MaterialIcons } from '@expo/vector-icons';

export default function MentionsLegalesScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Mentions Légales" showBack={true} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentRow}>
          <MaterialIcons name="policy" size={24} color={theme.icon} style={styles.icon} />
          <Text style={[styles.text, { color: theme.text }]}>
            Informations éditeur, hébergeur et coordonnées pour l'application BioAthlete, conformément à la loi...
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: Layout.spacing.md,
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.regular,
    lineHeight: 24,
  },
});
