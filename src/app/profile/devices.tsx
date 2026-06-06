import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { supabase } from '../../lib/supabase';

// ─── Integration definitions ──────────────────────────────────────────────────

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  accentColor: string;
  platformHint?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    description: 'Synchronisez vos données de santé, activité et entraînements.',
    icon: 'favorite',
    accentColor: '#FF3B30',
    platformHint: 'iOS uniquement',
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    description: 'Importez vos activités et métriques de santé depuis Google.',
    icon: 'fitness-center',
    accentColor: '#4285F4',
  },
  {
    id: 'garmin',
    name: 'Garmin Connect',
    description: 'Connectez votre montre Garmin pour synchroniser vos entraînements.',
    icon: 'watch',
    accentColor: '#00A6E0',
  },
  {
    id: 'strava',
    name: 'Strava',
    description: 'Partagez et importez vos activités depuis votre compte Strava.',
    icon: 'directions-run',
    accentColor: '#FC4C02',
  },
];

type ConnectedApps = Record<string, boolean>;

export default function DevicesScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [connectedApps, setConnectedApps] = useState<ConnectedApps>({
    apple_health: false,
    google_fit: false,
    garmin: false,
    strava: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState('');

  // ── Fetch connected apps from profiles on mount ──────────────────────────────
  useEffect(() => {
    const fetchConnectedApps = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('connected_apps')
          .eq('id', user.id)
          .single();

        if (!error && data?.connected_apps) {
          setConnectedApps((prev) => ({ ...prev, ...data.connected_apps }));
        }
      } catch (err) {
        console.error('Erreur chargement des intégrations:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConnectedApps();
  }, []);

  // ── Toggle handler with Supabase upsert ────────────────────────────────────
  const handleToggle = async (integrationId: string, newValue: boolean) => {
    if (!userId) return;

    // Optimistic UI update
    const updatedApps = { ...connectedApps, [integrationId]: newValue };
    setConnectedApps(updatedApps);
    setSavingId(integrationId);
    setGlobalError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, connected_apps: updatedApps },
          { onConflict: 'id' }
        );

      if (error) {
        // Rollback on error
        setConnectedApps((prev) => ({ ...prev, [integrationId]: !newValue }));
        setGlobalError('Impossible de sauvegarder. Veuillez réessayer.');
      }
    } catch (err) {
      // Rollback on error
      setConnectedApps((prev) => ({ ...prev, [integrationId]: !newValue }));
      setGlobalError('Une erreur inattendue est survenue.');
    } finally {
      setSavingId(null);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.icon }]}>
          Chargement des intégrations...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title="Appareils & Intégrations"
        leftContent={
          <TouchableOpacity
            onPress={goBack}
            style={{ padding: Layout.spacing.sm, marginLeft: -Layout.spacing.sm }}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Intro */}
        <View style={styles.introContainer}>
          <Text style={[styles.introTitle, { color: theme.text }]}>
            Connectez vos applications
          </Text>
          <Text style={[styles.introSubtitle, { color: theme.icon }]}>
            Synchronisez vos appareils et applications pour enrichir automatiquement vos statistiques et entraînements.
          </Text>
        </View>

        {/* Global Error */}
        {!!globalError && (
          <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2', borderColor: theme.danger }]}>
            <MaterialIcons name="error-outline" size={16} color={theme.danger} />
            <Text style={[styles.errorText, { color: '#991B1B' }]}>{globalError}</Text>
          </View>
        )}

        {/* Integration Cards */}
        {INTEGRATIONS.map((integration) => {
          const isEnabled = connectedApps[integration.id] ?? false;
          const isSaving = savingId === integration.id;
          const isIosOnly = integration.platformHint === 'iOS uniquement';
          const isDisabled = isIosOnly && Platform.OS === 'android';

          return (
            <View
              key={integration.id}
              style={[
                styles.cardWrapper,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  borderLeftColor: isEnabled ? integration.accentColor : theme.border,
                },
              ]}
            >
              {/* Left accent bar */}
              <View
                style={[
                  styles.accentBar,
                  { backgroundColor: isEnabled ? integration.accentColor : 'transparent' },
                ]}
              />

              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isEnabled
                      ? integration.accentColor + '20' // 12% opacity
                      : theme.border + '50',
                  },
                ]}
              >
                <MaterialIcons
                  name={integration.icon as any}
                  size={26}
                  color={isEnabled ? integration.accentColor : theme.icon}
                />
              </View>

              {/* Text Content */}
              <View style={styles.cardContent}>
                <View style={styles.nameRow}>
                  <Text style={[styles.integrationName, { color: theme.text }]}>
                    {integration.name}
                  </Text>
                  {integration.platformHint && (
                    <View
                      style={[
                        styles.platformBadge,
                        { backgroundColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.platformBadgeText, { color: theme.icon }]}>
                        {integration.platformHint}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[styles.integrationDesc, { color: theme.icon }]}
                  numberOfLines={2}
                >
                  {integration.description}
                </Text>
                {isEnabled && (
                  <View style={styles.connectedRow}>
                    <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.connectedText, { color: '#10B981' }]}>Connecté</Text>
                  </View>
                )}
                {isDisabled && (
                  <Text style={[styles.unavailableText, { color: theme.icon }]}>
                    Non disponible sur Android
                  </Text>
                )}
              </View>

              {/* Switch / Saving Indicator */}
              <View style={styles.switchContainer}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Switch
                    value={isEnabled}
                    onValueChange={(val) => handleToggle(integration.id, val)}
                    disabled={isDisabled}
                    trackColor={{
                      false: theme.border,
                      true: integration.accentColor,
                    }}
                    thumbColor={isEnabled ? '#FFFFFF' : theme.icon}
                    ios_backgroundColor={theme.border}
                  />
                )}
              </View>
            </View>
          );
        })}

        {/* Footer Note */}
        <View style={[styles.footerNote, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MaterialIcons name="info-outline" size={18} color={theme.icon} />
          <Text style={[styles.footerNoteText, { color: theme.icon }]}>
            Les données sont synchronisées en arrière-plan. La déconnexion n'efface pas les données déjà importées.
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Typography.sizes.md,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.xxl,
  },
  introContainer: {
    marginBottom: Layout.spacing.xl,
  },
  introTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Layout.spacing.sm,
  },
  introSubtitle: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Layout.spacing.lg,
  },
  errorText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  // Card with left-border accent
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Layout.borderRadius.xl,
    marginBottom: Layout.spacing.md,
    overflow: 'hidden',
    minHeight: 88,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Layout.spacing.md,
    marginRight: Layout.spacing.md,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    paddingVertical: Layout.spacing.md,
    paddingRight: Layout.spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: 4,
  },
  integrationName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  platformBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
  },
  platformBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  integrationDesc: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  connectedText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  unavailableText: {
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    fontStyle: 'italic',
  },
  switchContainer: {
    paddingHorizontal: Layout.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    marginTop: Layout.spacing.md,
  },
  footerNoteText: {
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    flex: 1,
  },
});
