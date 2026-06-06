import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../../hooks/useThemeColor';

export default function AthleteProfileScreen() {
  const { id } = useLocalSearchParams();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: 'Profil Athlète', headerBackTitle: 'Retour' }} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>Profil de l'athlète</Text>
        <Text style={{ color: theme.icon, marginTop: 8 }}>ID: {id}</Text>
        <Text style={{ color: theme.icon, marginTop: 20, textAlign: 'center', paddingHorizontal: 40 }}>
          Cette page est en cours de développement. Vous pourrez bientôt voir l'historique complet, les graphiques de progression et les détails d'entraînement de cet athlète ici.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
