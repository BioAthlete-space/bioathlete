import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';

export default function CoachDashboardScreen() {
  const { signOut } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        title="Espace Coach" 
        rightContent={
          <TouchableOpacity onPress={handleSignOut} style={{ padding: 8, marginRight: -8 }}>
            <MaterialIcons name="logout" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: theme.icon }]}>Athlètes</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#F44336' }]}>0</Text>
            <Text style={[styles.statLabel, { color: theme.icon }]}>Alertes SprintFlow</Text>
          </Card>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Check-ins du jour</Text>
        
        <Card style={{ padding: Layout.spacing.xl, alignItems: 'center', marginTop: 16 }}>
          <MaterialIcons name="groups" size={48} color={theme.icon} style={{ opacity: 0.5, marginBottom: 16 }} />
          <Text style={{ color: theme.text, textAlign: 'center', fontSize: Typography.sizes.md, marginBottom: 8 }}>
            Aucun athlète lié pour le moment.
          </Text>
          <Text style={{ color: theme.icon, textAlign: 'center', fontSize: Typography.sizes.sm }}>
            Partagez votre ID Coach pour que vos athlètes se connectent à vous.
          </Text>
        </Card>

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
  statsContainer: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Layout.spacing.md,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
  },
});
