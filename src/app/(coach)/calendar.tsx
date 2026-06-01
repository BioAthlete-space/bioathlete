import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useThemeColor';
import { Header } from '../../components/Header';
import { Layout } from '../../constants/Layout';

export default function CoachAthletesScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Mes Athlètes" />
      <View style={styles.content}>
        <Text style={{ color: theme.text }}>Liste des athlètes à venir...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Layout.spacing.lg },
});
