import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/useThemeColor';
import { Layout } from '../../../constants/Layout';
import { Typography } from '../../../constants/Typography';
import { Card } from '../../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AthleteProfile {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  weightkg: number | null;
  heightcm: number | null;
  maindiscipline: string | null;
}

interface Checkin {
  date: string;
  haspain: boolean | null;
  fatigue: number | null;
  motivation: number | null;
  sleephours: number | null;
  sleepquality: number | null;
  wakeupfeeling: number | null;
  score: number | null;
}

interface Workout {
  id: string;
  title?: string;
  name?: string;
  date: string;
}

interface NutritionLog {
  calories: number;
}

interface NutritionProfile {
  target_calories: number | null;
}

interface CoachPeriodization {
  id: string;
  name: string;
  color: string | null;
  start_date: string;
  end_date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstname: string, lastname: string): string {
  return `${(firstname?.[0] ?? '').toUpperCase()}${(lastname?.[0] ?? '').toUpperCase()}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function levelBar(level: number | null, max: number = 10): string {
  if (level == null) return '—';
  const filled = Math.min(Math.max(Math.round(level), 0), max);
  return '█'.repeat(filled) + '░'.repeat(max - filled);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AthleteProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();

  const athleteId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<Workout[]>([]);
  const [caloriesToday, setCaloriesToday] = useState<number>(0);
  const [targetCalories, setTargetCalories] = useState<number | null>(null);
  const [periodizations, setPeriodizations] = useState<CoachPeriodization[]>([]);

  useEffect(() => {
    if (!athleteId) return;

    const today = getTodayISO();

    async function fetchAll() {
      try {
        const [
          profileRes,
          checkinRes,
          recentRes,
          upcomingRes,
          nutritionLogRes,
          nutritionProfileRes,
          groupMembersRes,
        ] = await Promise.all([
          // 1. Athlete profile
          supabase
            .from('profiles')
            .select('id, firstname, lastname, email, weightkg, heightcm, maindiscipline')
            .eq('id', athleteId)
            .single(),

          // 2. Last check-in
          supabase
            .from('checkins')
            .select('date, haspain, fatigue, motivation, sleephours, sleepquality, wakeupfeeling, score')
            .eq('user_id', athleteId)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle(),

          // 3. Last 3 past workouts
          supabase
            .from('workouts')
            .select('id, title, name, date')
            .eq('athlete_id', athleteId)
            .lte('date', today)
            .order('date', { ascending: false })
            .limit(3),

          // 4. Next 3 upcoming workouts
          supabase
            .from('workouts')
            .select('id, title, name, date')
            .eq('athlete_id', athleteId)
            .gt('date', today)
            .order('date', { ascending: true })
            .limit(3),

          // 5. Nutrition logs today
          supabase
            .from('nutrition_logs')
            .select('calories')
            .eq('athlete_id', athleteId)
            .eq('date', today),

          // 6. Nutrition profile
          supabase
            .from('nutrition_profiles')
            .select('target_calories')
            .eq('athlete_id', athleteId)
            .maybeSingle(),

          // 7. Athlete's group memberships
          supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', athleteId),
        ]);

        if (profileRes.data) setProfile(profileRes.data as AthleteProfile);
        if (checkinRes.data) setCheckin(checkinRes.data as Checkin);

        if (recentRes.data) {
          setRecentWorkouts(recentRes.data as Workout[]);
        }
        if (upcomingRes.data) {
          setUpcomingWorkouts(upcomingRes.data as Workout[]);
        }

        if (nutritionLogRes.data) {
          const total = (nutritionLogRes.data as NutritionLog[]).reduce(
            (sum, row) => sum + (row.calories ?? 0),
            0
          );
          setCaloriesToday(total);
        }

        if (nutritionProfileRes.data) {
          setTargetCalories(
            (nutritionProfileRes.data as NutritionProfile).target_calories
          );
        }

        // 8. Fetch upcoming periodizations for the athlete's groups
        if (groupMembersRes.data && groupMembersRes.data.length > 0) {
          const groupIds = groupMembersRes.data.map((m: { group_id: string }) => m.group_id);
          const periodizationsRes = await supabase
            .from('coach_periodizations')
            .select('id, name, color, start_date, end_date')
            .in('group_id', groupIds)
            .gte('start_date', today)
            .order('start_date', { ascending: true })
            .limit(3);

          if (periodizationsRes.data) {
            setPeriodizations(periodizationsRes.data as CoachPeriodization[]);
          }
        }
      } catch (err) {
        console.error('[AthleteProfile] fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [athleteId]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Profil Athlète', headerBackTitle: 'Retour' }} />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const fullName = profile
    ? `${profile.firstname ?? ''} ${profile.lastname ?? ''}`.trim()
    : 'Athlète';

  const hasPain = checkin?.haspain === true;
  const statusColor = hasPain ? '#EF4444' : '#10B981';
  const statusLabel = hasPain ? 'Douleur signalée' : 'En forme';
  const statusIcon: keyof typeof MaterialIcons.glyphMap = hasPain
    ? 'warning'
    : 'check-circle';

  const calorieProgress =
    targetCalories && targetCalories > 0
      ? Math.min(caloriesToday / targetCalories, 1)
      : 0;

  const progressColor =
    calorieProgress >= 1 ? '#EF4444' : calorieProgress >= 0.8 ? '#F59E0B' : theme.primary;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: fullName,
          headerBackTitle: 'Retour',
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.card },
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: Layout.spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Hero Card ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <Card elevation="light" style={styles.heroCard}>
            {/* Avatar */}
            <View style={styles.heroRow}>
              <View style={[styles.avatarCircle, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarInitials}>
                  {profile ? getInitials(profile.firstname ?? '', profile.lastname ?? '') : '?'}
                </Text>
              </View>

              <View style={styles.heroInfo}>
                <Text style={[styles.heroName, { color: theme.text }]}>{fullName}</Text>
                {profile?.email ? (
                  <Text style={[styles.heroEmail, { color: theme.icon }]}>
                    {profile.email}
                  </Text>
                ) : null}

                {profile?.maindiscipline ? (
                  <Text style={[styles.heroDiscipline, { color: theme.primary }]}>
                    {profile.maindiscipline}
                  </Text>
                ) : null}

                {/* Badges */}
                <View style={styles.badgesRow}>
                  {profile?.weightkg != null && (
                    <View style={[styles.badge, { backgroundColor: theme.surface }]}>
                      <MaterialIcons name="fitness-center" size={12} color={theme.icon} />
                      <Text style={[styles.badgeText, { color: theme.icon }]}>
                        {profile.weightkg} kg
                      </Text>
                    </View>
                  )}
                  {profile?.heightcm != null && (
                    <View style={[styles.badge, { backgroundColor: theme.surface }]}>
                      <MaterialIcons name="height" size={12} color={theme.icon} />
                      <Text style={[styles.badgeText, { color: theme.icon }]}>
                        {profile.heightcm} cm
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Status indicator */}
            <View style={[styles.statusBar, { backgroundColor: `${statusColor}18` }]}>
              <MaterialIcons name={statusIcon} size={16} color={statusColor} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* ── 2. Dernier Bilan de Forme ─────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(100).duration(400).springify()}>
          <Card title="Dernier Bilan de Forme" elevation="none">
            {checkin == null ? (
              <View style={styles.emptyRow}>
                <MaterialIcons name="inbox" size={20} color={theme.icon} />
                <Text style={[styles.emptyText, { color: theme.icon }]}>
                  Aucun bilan effectué
                </Text>
              </View>
            ) : (
              <View style={styles.checkinContent}>
                {/* Date */}
                <View style={styles.checkinRow}>
                  <MaterialIcons name="calendar-today" size={16} color={theme.icon} />
                  <Text style={[styles.checkinLabel, { color: theme.icon }]}>Date</Text>
                  <Text style={[styles.checkinValue, { color: theme.text }]}>
                    {formatDate(checkin.date)}
                  </Text>
                </View>

                {/* Score global */}
                {checkin.score != null && (
                  <View style={styles.checkinRow}>
                    <MaterialIcons name="stars" size={16} color={theme.icon} />
                    <Text style={[styles.checkinLabel, { color: theme.icon }]}>Score</Text>
                    <View style={[styles.scoreBadge, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.scoreText, { color: theme.primary }]}>
                        {checkin.score}/100
                      </Text>
                    </View>
                  </View>
                )}

                {/* Fatigue */}
                <View style={styles.checkinRow}>
                  <MaterialIcons name="battery-alert" size={16} color={theme.icon} />
                  <Text style={[styles.checkinLabel, { color: theme.icon }]}>Fatigue</Text>
                  <Text style={[styles.levelBar, { color: '#F59E0B' }]}>
                    {levelBar(checkin.fatigue)}
                  </Text>
                  {checkin.fatigue != null && (
                    <Text style={[styles.levelNum, { color: theme.icon }]}>
                      {checkin.fatigue}/10
                    </Text>
                  )}
                </View>

                {/* Motivation */}
                <View style={styles.checkinRow}>
                  <MaterialIcons name="bolt" size={16} color={theme.icon} />
                  <Text style={[styles.checkinLabel, { color: theme.icon }]}>Motivation</Text>
                  <Text style={[styles.levelBar, { color: '#10B981' }]}>
                    {levelBar(checkin.motivation)}
                  </Text>
                  {checkin.motivation != null && (
                    <Text style={[styles.levelNum, { color: theme.icon }]}>
                      {checkin.motivation}/10
                    </Text>
                  )}
                </View>

                {/* Sleep hours */}
                {checkin.sleephours != null && (
                  <View style={styles.checkinRow}>
                    <MaterialIcons name="bedtime" size={16} color={theme.icon} />
                    <Text style={[styles.checkinLabel, { color: theme.icon }]}>Sommeil</Text>
                    <Text style={[styles.checkinValue, { color: theme.text }]}>
                      {checkin.sleephours}h
                      {checkin.sleepquality != null
                        ? `  · qualité ${checkin.sleepquality}/10`
                        : ''}
                    </Text>
                  </View>
                )}

                {/* Wakeup feeling */}
                {checkin.wakeupfeeling != null && (
                  <View style={styles.checkinRow}>
                    <MaterialIcons name="wb-sunny" size={16} color={theme.icon} />
                    <Text style={[styles.checkinLabel, { color: theme.icon }]}>Réveil</Text>
                    <Text style={[styles.levelBar, { color: '#6366F1' }]}>
                      {levelBar(checkin.wakeupfeeling)}
                    </Text>
                    <Text style={[styles.levelNum, { color: theme.icon }]}>
                      {checkin.wakeupfeeling}/10
                    </Text>
                  </View>
                )}

                {/* Pain */}
                <View style={styles.checkinRow}>
                  <MaterialIcons name="healing" size={16} color={theme.icon} />
                  <Text style={[styles.checkinLabel, { color: theme.icon }]}>Douleur</Text>
                  <View
                    style={[
                      styles.painBadge,
                      { backgroundColor: hasPain ? '#EF444420' : '#10B98120' },
                    ]}
                  >
                    <Text style={{ color: hasPain ? '#EF4444' : '#10B981', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }}>
                      {checkin.haspain ? 'Oui' : 'Non'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* ── 3. Nutrition Aujourd'hui ──────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).duration(400).springify()}>
          <Card title="Nutrition Aujourd'hui" elevation="none">
            <View style={styles.nutritionRow}>
              <MaterialIcons name="restaurant" size={20} color={theme.primary} />
              <Text style={[styles.nutritionValue, { color: theme.text }]}>
                <Text style={{ color: theme.primary, fontWeight: Typography.weights.bold }}>
                  {caloriesToday}
                </Text>
                {targetCalories != null ? ` / ${targetCalories}` : ''}
                <Text style={{ color: theme.icon, fontWeight: Typography.weights.regular }}>
                  {' '}kcal
                </Text>
              </Text>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: theme.surface }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(calorieProgress * 100)}%` as any,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>

            {targetCalories != null && (
              <Text style={[styles.progressLabel, { color: theme.icon }]}>
                {Math.round(calorieProgress * 100)}% de l'objectif journalier
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* ── 4. Périodisations à venir ─────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(300).duration(400).springify()}>
          <Card title="Périodisations à venir" elevation="none">
            {periodizations.length === 0 ? (
              <View style={styles.emptyRow}>
                <MaterialIcons name="event-note" size={20} color={theme.icon} />
                <Text style={[styles.emptyText, { color: theme.icon }]}>
                  Aucune périodisation planifiée
                </Text>
              </View>
            ) : (
              periodizations.map((p, index) => (
                <View
                  key={p.id}
                  style={[
                    styles.periodizationRow,
                    index < periodizations.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.periodizationDot,
                      { backgroundColor: p.color ?? theme.primary },
                    ]}
                  />
                  <View style={styles.periodizationInfo}>
                    <Text style={[styles.periodizationName, { color: theme.text }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.periodizationDates, { color: theme.icon }]}>
                      {formatDate(p.start_date)} → {formatDate(p.end_date)}
                    </Text>
                  </View>
                  <MaterialIcons name="event" size={16} color={p.color ?? theme.primary} />
                </View>
              ))
            )}
          </Card>
        </Animated.View>

        {/* ── 5. Séances Récentes ───────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(400).duration(400).springify()}>
          <Card title="Séances Récentes" elevation="none">
            {recentWorkouts.length === 0 ? (
              <View style={styles.emptyRow}>
                <MaterialIcons name="history" size={20} color={theme.icon} />
                <Text style={[styles.emptyText, { color: theme.icon }]}>
                  Aucune séance enregistrée
                </Text>
              </View>
            ) : (
              recentWorkouts.map((w, index) => (
                <View
                  key={w.id}
                  style={[
                    styles.workoutRow,
                    index < recentWorkouts.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[styles.workoutDot, { backgroundColor: theme.primary }]}
                  />
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutTitle, { color: theme.text }]}>
                      {w.title ?? w.name ?? 'Séance'}
                    </Text>
                    <Text style={[styles.workoutDate, { color: theme.icon }]}>
                      {formatDate(w.date)}
                    </Text>
                  </View>
                  <MaterialIcons name="check-circle" size={16} color="#10B981" />
                </View>
              ))
            )}
          </Card>
        </Animated.View>

        {/* ── 6. Prochaines Séances ─────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(500).duration(400).springify()}>
          <Card title="Prochaines Séances" elevation="none" style={styles.lastCard}>
            {upcomingWorkouts.length === 0 ? (
              <View style={styles.emptyRow}>
                <MaterialIcons name="event-available" size={20} color={theme.icon} />
                <Text style={[styles.emptyText, { color: theme.icon }]}>
                  Aucune séance planifiée
                </Text>
              </View>
            ) : (
              upcomingWorkouts.map((w, index) => (
                <View
                  key={w.id}
                  style={[
                    styles.workoutRow,
                    index < upcomingWorkouts.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.border,
                    },
                  ]}
                >
                  <View
                    style={[styles.workoutDot, { backgroundColor: theme.primary + '60' }]}
                  />
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutTitle, { color: theme.text }]}>
                      {w.title ?? w.name ?? 'Séance'}
                    </Text>
                    <Text style={[styles.workoutDate, { color: theme.icon }]}>
                      {formatDate(w.date)}
                    </Text>
                  </View>
                  <MaterialIcons name="schedule" size={16} color={theme.primary} />
                </View>
              ))
            )}
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.xxl,
  },

  // Hero
  heroCard: {
    marginBottom: Layout.spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  heroInfo: {
    flex: 1,
    gap: Layout.spacing.xs,
  },
  heroName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  heroEmail: {
    fontSize: Typography.sizes.sm,
  },
  heroDiscipline: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    textTransform: 'capitalize',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Layout.spacing.sm,
    marginTop: Layout.spacing.xs,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 3,
    borderRadius: Layout.borderRadius.pill,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  // Check-in
  checkinContent: {
    gap: Layout.spacing.sm,
  },
  checkinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  checkinLabel: {
    fontSize: Typography.sizes.sm,
    width: 76,
  },
  checkinValue: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  levelBar: {
    fontSize: 10,
    letterSpacing: 1,
    flex: 1,
  },
  levelNum: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  scoreBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.pill,
  },
  scoreText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  painBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.pill,
  },

  // Nutrition
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  nutritionValue: {
    fontSize: Typography.sizes.lg,
  },
  progressTrack: {
    height: 10,
    borderRadius: Layout.borderRadius.pill,
    overflow: 'hidden',
    marginBottom: Layout.spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: Layout.borderRadius.pill,
  },
  progressLabel: {
    fontSize: Typography.sizes.xs,
    textAlign: 'right',
  },

  // Periodizations
  periodizationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
  },
  periodizationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  periodizationInfo: {
    flex: 1,
    gap: 2,
  },
  periodizationName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  periodizationDates: {
    fontSize: Typography.sizes.xs,
  },

  // Workouts
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
  },
  workoutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  workoutInfo: {
    flex: 1,
    gap: 2,
  },
  workoutTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  workoutDate: {
    fontSize: Typography.sizes.xs,
  },

  // Empty states
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.sm,
    fontStyle: 'italic',
  },

  lastCard: {
    marginBottom: 0,
  },
});
