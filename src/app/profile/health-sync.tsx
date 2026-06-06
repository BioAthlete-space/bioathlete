import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { Typography } from '../../constants/Typography';
import { Layout } from '../../constants/Layout';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';

// Définition des services disponibles
const SYNC_CATEGORIES = [
  {
    id: 'health',
    title: 'Santé',
    icon: 'favorite',
    services: [
      { id: 'apple_health', name: 'Apple Santé', icon: 'favorite' },
      { id: 'google_health', name: 'Google Health Connect', icon: 'favorite' },
    ]
  },
  {
    id: 'watches',
    title: 'Montres sportives',
    icon: 'watch',
    services: [
      { id: 'amazfit', name: 'Amazfit', icon: 'watch' },
      { id: 'garmin', name: 'Garmin', icon: 'watch' },
      { id: 'coros', name: 'Coros', icon: 'watch' },
      { id: 'polar', name: 'Polar', icon: 'watch' },
      { id: 'suunto', name: 'Suunto', icon: 'watch' },
    ]
  },
  {
    id: 'scales',
    title: 'Balances connectées',
    icon: 'monitor-weight',
    services: [
      { id: 'amazfit_scale', name: 'Amazfit Smart Scale', icon: 'monitor-weight' },
      { id: 'withings', name: 'Withings', icon: 'monitor-weight' },
      { id: 'renpho', name: 'Renpho', icon: 'monitor-weight' },
    ]
  }
];

const SYNCED_DATA = [
  'Poids',
  'Masse grasse',
  'Fréquence cardiaque',
  'Sommeil',
  'Activité quotidienne',
  'Entraînements'
];

export default function HealthSyncScreen() {
  const theme = useTheme();
  const [connectedServices, setConnectedServices] = useState<string[]>([]);

  const toggleConnection = (serviceId: string) => {
    setConnectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Synchronisation',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }} 
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <MaterialIcons name="sync" size={48} color={theme.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.title, { color: theme.text }]}>Centre de Synchronisation</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Connectez vos appareils et applications pour enrichir automatiquement vos statistiques.
          </Text>
        </View>

        {SYNC_CATEGORIES.map(category => (
          <View key={category.id} style={styles.categoryContainer}>
            <View style={styles.categoryHeader}>
              <MaterialIcons name={category.icon as any} size={24} color={theme.text} />
              <Text style={[styles.categoryTitle, { color: theme.text }]}>{category.title}</Text>
            </View>

            <Card padding="none" style={styles.card}>
              {category.services.map((service, index) => {
                const isConnected = connectedServices.includes(service.id);
                const isLast = index === category.services.length - 1;

                return (
                  <View 
                    key={service.id} 
                    style={[
                      styles.serviceRow, 
                      { borderBottomColor: theme.border },
                      isLast && { borderBottomWidth: 0 }
                    ]}
                  >
                    <View style={styles.serviceInfo}>
                      <View style={[styles.iconContainer, { backgroundColor: theme.surfaceSecondary }]}>
                        <MaterialIcons name={service.icon as any} size={24} color={theme.text} />
                      </View>
                      <View>
                        <Text style={[styles.serviceName, { color: theme.text }]}>{service.name}</Text>
                        <View style={styles.statusContainer}>
                          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : theme.icon }]} />
                          <Text style={[styles.statusText, { color: isConnected ? '#4CAF50' : theme.icon }]}>
                            {isConnected ? 'Connecté' : 'Non connecté'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity 
                      style={[
                        styles.actionButton, 
                        isConnected ? styles.actionButtonDisconnect : { backgroundColor: theme.primary }
                      ]}
                      onPress={() => toggleConnection(service.id)}
                    >
                      <Text style={[
                        styles.actionButtonText, 
                        isConnected ? { color: '#FF3B30' } : { color: '#FFF' }
                      ]}>
                        {isConnected ? 'Déconnecter' : 'Connecter'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </Card>
          </View>
        ))}

        <View style={styles.syncedDataContainer}>
          <Text style={[styles.categoryTitle, { color: theme.text, marginBottom: Layout.spacing.md }]}>
            Données synchronisées
          </Text>
          <Text style={[styles.syncedDesc, { color: theme.icon }]}>
            En connectant vos services, SprintFlow importera automatiquement ces données :
          </Text>
          
          <View style={styles.chipsContainer}>
            {SYNCED_DATA.map(dataItem => (
              <Chip
                key={dataItem}
                label={dataItem}
                isSelected={true} // Display them as active to show they are supported
                onPress={() => {}} // Non-interactive in this view
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    marginBottom: Layout.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  categoryContainer: {
    marginBottom: Layout.spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  categoryTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    marginLeft: Layout.spacing.sm,
  },
  card: {
    overflow: 'hidden',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderBottomWidth: 1,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Layout.spacing.md,
  },
  serviceName: {
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: 20,
    marginLeft: Layout.spacing.md,
  },
  actionButtonDisconnect: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    fontSize: Typography.sizes.sm,
    fontWeight: 'bold',
  },
  syncedDataContainer: {
    marginTop: Layout.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)', // Very subtle background
    padding: Layout.spacing.lg,
    borderRadius: 16,
  },
  syncedDesc: {
    fontSize: Typography.sizes.sm,
    marginBottom: Layout.spacing.md,
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  }
});
