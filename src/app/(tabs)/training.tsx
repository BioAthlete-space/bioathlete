import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { CustomButton } from '../../components/CustomButton';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

const getEffortSummary = (item: any) => {
  let parts = [];
  if (item.exercise_name) parts.push(`🏋️ ${item.exercise_name}`);
  if (item.sets && item.reps) parts.push(`${item.sets} x ${item.reps}`);
  else if (item.sets) parts.push(`${item.sets} séries`);
  else if (item.reps) parts.push(`${item.reps} reps`);
  if (item.charge) parts.push(item.charge);
  if (item.duration) parts.push(`⏱ ${item.duration}`);
  if (item.distance) parts.push(`📏 ${item.distance}`);
  if (item.intensity) parts.push(`⚡ ${item.intensity}`);
  if (parts.length === 0) return "Effort vide";
  return parts.join(' • ');
};

// Générateur de calendrier (60 jours avant, 60 jours après)
const generateRollingCalendar = () => {
  const dates = [];
  const today = new Date();
  const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  for (let i = -60; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    // Utiliser l'heure locale pour éviter le décalage UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    dates.push({
      id: `${year}-${month}-${day}`, // Format local YYYY-MM-DD
      dateObj: d,
      dayStr: daysOfWeek[d.getDay()],
      dateStr: d.getDate().toString(),
      isToday: i === 0
    });
  }
  return dates;
};

export default function TrainingScreen() {
  const theme = useTheme();
  
  const [calendarDays, setCalendarDays] = useState(generateRollingCalendar());
  
  // Extraire l'ID local pour aujourd'hui
  const todayDate = new Date();
  const tYear = todayDate.getFullYear();
  const tMonth = String(todayDate.getMonth() + 1).padStart(2, '0');
  const tDay = String(todayDate.getDate()).padStart(2, '0');
  const todayId = `${tYear}-${tMonth}-${tDay}`;
  
  const [selectedDateId, setSelectedDateId] = useState(todayId); // Sélectionne "Aujourd'hui" par défaut
  const [isFabOpen, setIsFabOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);

  const fetchWorkouts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Obtenir les groupes où l'utilisateur est membre
    const { data: memberships } = await supabase.from('group_members').select('group_id').eq('athlete_id', user.id);
    const groupIds = memberships?.map(m => m.group_id) || [];
    
    // Obtenir aussi les groupes où l'utilisateur est le coach (très utile pour tester)
    const { data: coachGroups } = await supabase.from('coach_groups').select('id').eq('coach_id', user.id);
    const coachGroupIds = coachGroups?.map(g => g.id) || [];

    const allGroupIds = [...new Set([...groupIds, ...coachGroupIds])];

    if (allGroupIds.length === 0) return;

    // Charger les 60 derniers jours et les 60 prochains jours
    const start = new Date(); start.setDate(start.getDate() - 60);
    const end = new Date(); end.setDate(end.getDate() + 60);
    const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    const { data: wData } = await supabase.from('workouts')
      .select('*')
      .in('group_id', allGroupIds)
      .gte('date', format(start))
      .lte('date', format(end));
      
    // Obtenir les sous-groupes de l'athlète
    const { data: subData } = await supabase.from('subgroup_members').select('subgroup_id').eq('athlete_id', user.id);
    const mySubgroupIds = subData?.map(s => s.subgroup_id) || [];

    // Filtrer les compétitions où l'athlète n'est pas participant
    // ET filtrer les séances assignées à d'autres sous-groupes
    const filtered = (wData || []).filter(w => {
      if (w.subgroup_id && !mySubgroupIds.includes(w.subgroup_id) && !coachGroupIds.includes(w.group_id)) {
        return false; // Séance pour un autre sous-groupe
      }
      if (w.type === 'Compétition' && w.participant_ids && w.participant_ids.length > 0) {
        return w.participant_ids.includes(user.id);
      }
      return true;
    });

    setWorkouts(filtered);
  };

  useEffect(() => {
    fetchWorkouts();

    // Abonnement Supabase Realtime pour rafraîchissement "en direct"
    const channel = supabase.channel('workouts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, payload => {
        fetchWorkouts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Ramener à aujourd'hui quand on change de menu
      setSelectedDateId(todayId);
      
      // Centrer le calendrier sur "aujourd'hui" (index 60)
      setTimeout(() => {
        const todayIndex = 60;
        const itemWidth = 60 + Layout.spacing.sm; // Largeur du bouton + gap
        const screenWidth = Layout.window.width;
        const centerOffset = (todayIndex * itemWidth) - (screenWidth / 2) + (itemWidth / 2) + Layout.spacing.lg;
        
        scrollViewRef.current?.scrollTo({ x: centerOffset, animated: true });
      }, 100);
    }, [])
  );

  // Récupérer les infos du jour sélectionné
  const selectedDayInfo = calendarDays.find(d => d.id === selectedDateId);
  const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedSelectedDate = selectedDayInfo ? formatter.format(selectedDayInfo.dateObj) : '';
  const capitalizedDate = formattedSelectedDate.charAt(0).toUpperCase() + formattedSelectedDate.slice(1);

  // Formatter pour le mois affiché au dessus du calendrier
  const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
  const displayedMonth = selectedDayInfo ? monthFormatter.format(selectedDayInfo.dateObj) : '';
  const capitalizedMonth = displayedMonth.charAt(0).toUpperCase() + displayedMonth.slice(1);

  return (
    <View style={styles.container}>
      {/* Fond Dégradé Premium avec profondeur */}
      <LinearGradient 
        colors={[theme.gradientStart || '#F8FAFC', theme.gradientMiddle || '#F1F5F9', theme.gradientEnd || '#E2E8F0']}
        style={StyleSheet.absoluteFill} 
      />
      {/* Formes subtiles pour l'aura Premium (identique à l'accueil) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgBlob, { top: -200, right: -200, width: 800, height: 800, borderRadius: 400, backgroundColor: theme.primary }]} />
        <View style={[styles.bgBlob, { top: 400, left: -300, width: 700, height: 700, borderRadius: 350, backgroundColor: theme.secondary }]} />
      </View>

      <Header title="Entraînements" />
      
      {/* Calendrier Horizontal */}
      <View style={styles.calendarContainer}>
        <View style={styles.monthHeaderRow}>
          <Text style={[styles.monthText, { color: theme.text }]}>{capitalizedMonth}</Text>
        </View>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.calendarScroll}
        >
          {calendarDays.map((item) => {
            const isSelected = item.id === selectedDateId;
            const hasDaySession = workouts.some(w => w.date === item.id);
            const isPast = item.id < todayId;
            const isToday = item.id === todayId;
            
            // Logique de couleurs
            let bgColor = 'transparent';
            let borderColor = theme.border;
            let dayColor = theme.icon;
            let dateColor = theme.text;
            
            if (isSelected) {
              bgColor = theme.primary;
              borderColor = theme.primary;
              dayColor = '#FFF';
              dateColor = '#FFF';
            } else if (isPast) {
              bgColor = theme.card + '50';
              borderColor = theme.border + '50';
              dayColor = theme.icon + '60';
              dateColor = theme.text + '60';
            } else if (isToday) {
              bgColor = theme.primary + '20';
              borderColor = theme.primary;
              dayColor = theme.primary;
              dateColor = theme.primary;
            } else {
              // Future
              bgColor = theme.card;
              borderColor = theme.border;
            }

            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedDateId(item.id)}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                  }
                ]}
              >
                <Text style={[styles.dayText, { color: dayColor }]}>{item.dayStr}</Text>
                <Text style={[styles.dateText, { color: dateColor }]}>{item.dateStr}</Text>
                {/* Indicateur de séance */}
                <View 
                  style={[
                    styles.sessionDot, 
                    { 
                      backgroundColor: hasDaySession ? (isSelected ? '#FFF' : isPast ? theme.primary + '50' : theme.primary) : 'transparent' 
                    }
                  ]} 
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* En-tête du jour */}
        <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.dayHeader} key={`header-${selectedDateId}`}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{capitalizedDate}</Text>
          <Text style={[styles.daySubtitle, { color: theme.icon }]}>
            {workouts.filter(w => w.date === selectedDateId).length > 0 ? "Jour d'entraînement" : "Journée libre"}
          </Text>
        </Animated.View>
        
        {/* Container de la Timeline (Conditionnel) */}
        {workouts.filter(w => w.date === selectedDateId).length > 0 ? (
          <View style={styles.timelineContainer} key={`timeline-${selectedDateId}`}>
            
            {workouts.filter(w => w.date === selectedDateId).map((workout, index, arr) => {
              const isLast = index === arr.length - 1;
              const isRest = workout.type === 'Repos';
              const isComp = workout.type === 'Compétition';
              const nodeColor = isRest ? theme.border : isComp ? '#F59E0B' : theme.primary;
              const cardBgColor = isRest ? theme.border + '20' : isComp ? '#F59E0B' + '0A' : theme.primary + '0A';
              const cardBorderColor = isRest ? theme.border : isComp ? '#F59E0B' + '30' : theme.primary + '20';

              return (
                <Animated.View entering={FadeInUp.delay(200 + index * 100).springify()} style={styles.timelineItem} key={workout.id}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineNode, { borderColor: nodeColor, backgroundColor: theme.background }]} />
                    {!isLast && <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timeText, { color: theme.icon }]}>Prévu aujourd'hui</Text>
                    <Card elevation="none" style={[styles.sessionCard, { backgroundColor: cardBgColor, borderColor: cardBorderColor, borderWidth: 1 }]}>
                      
                      <View style={styles.sessionHeader}>
                        <View style={[styles.tag, { backgroundColor: nodeColor + '20' }]}>
                          <Text style={[styles.tagText, { color: nodeColor === theme.border ? theme.text : nodeColor }]}>{workout.type}</Text>
                        </View>
                      </View>
                      
                      <Text style={[styles.sessionTitle, { color: theme.text }]}>{workout.title}</Text>
                      
                      {isRest && (
                        <Text style={[styles.sessionDesc, { color: theme.icon, marginTop: 8 }]}>🛌 {workout.description}</Text>
                      )}

                      {isComp && (
                        <View style={{ marginTop: 8 }}>
                          {workout.location ? (
                            <TouchableOpacity 
                              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                              onPress={() => {
                                const mapUrl = Platform.select({
                                  ios: `http://maps.apple.com/?q=${encodeURIComponent(workout.location)}`,
                                  android: `geo:0,0?q=${encodeURIComponent(workout.location)}`,
                                  default: `https://maps.google.com/?q=${encodeURIComponent(workout.location)}`
                                });
                                if (mapUrl) Linking.openURL(mapUrl).catch(() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(workout.location)}`));
                              }}
                            >
                              <Text style={{ color: theme.icon }}>📍 </Text>
                              <Text style={{ color: theme.primary, textDecorationLine: 'underline', flex: 1 }}>Ouvrir l'itinéraire ({workout.location})</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={{ color: theme.icon, marginBottom: 4 }}>📍 Lieu non défini</Text>
                          )}
                          
                          {workout.link_url && (
                            <TouchableOpacity 
                              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}
                              onPress={() => {
                                let url = workout.link_url;
                                if (url.startsWith('/') || url.includes('/main.html/html.aspx') || url.includes('asp.net/main.html')) {
                                  url = `https://www.google.com/search?q=${encodeURIComponent(workout.title + " athlétisme")}`;
                                } else if (!url.startsWith('http')) {
                                  url = 'https://' + url;
                                }
                                Linking.openURL(url).catch(console.error);
                              }}
                            >
                              <Text style={{ color: theme.primary }}>🔗 </Text>
                              <Text style={{ color: theme.primary, textDecorationLine: 'underline', flex: 1 }}>Lien officiel de l'événement</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {(!isRest && !isComp) && (
                        <View style={{ marginTop: 8 }}>
                          {(workout.content?.items || []).slice(0, 3).map((item: any, i: number) => {
                            if (item.itemType === 'title') return <Text key={i} style={{ fontWeight: 'bold', color: theme.text, marginTop: 4 }}>{item.value}</Text>;
                            if (item.itemType === 'effort') return <Text key={i} style={{ color: theme.icon }}>• {getEffortSummary(item)}</Text>;
                            return null;
                          })}
                          {(workout.content?.items || []).length > 3 && (
                            <Text style={{ color: theme.icon, fontStyle: 'italic', marginTop: 4 }}>+ {(workout.content?.items || []).length - 3} autres blocs...</Text>
                          )}
                        </View>
                      )}
                      
                      {(!isRest && !isComp) && (
                        <CustomButton title="Voir la séance complète" variant="secondary" size="small" style={styles.actionButton} />
                      )}
                    </Card>
                  </View>
                </Animated.View>
              );
            })}

          </View>
        ) : (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={{ alignItems: 'center', marginTop: Layout.spacing.xxl }} key={`empty-${selectedDateId}`}>
            <MaterialIcons name="hotel" size={64} color={theme.icon} style={{ opacity: 0.5, marginBottom: Layout.spacing.md }} />
            <Text style={{ color: theme.text, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>Aucune séance prévue</Text>
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: Layout.spacing.sm }}>Profitez de ce jour pour bien récupérer ou attendez les instructions du coach.</Text>
          </Animated.View>
        )}

      </ScrollView>

      {/* Menu FAB */}
      {isFabOpen && (
        <>
          <TouchableOpacity 
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9 }]} 
            activeOpacity={1} 
            onPress={() => setIsFabOpen(false)} 
          />
          <View style={styles.fabMenu}>
            <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.fabMenuItem}>
              <Text style={[styles.fabMenuLabel, { color: theme.text, backgroundColor: theme.card }]}>Ajouter une compétition</Text>
              <TouchableOpacity style={[styles.miniFab, { backgroundColor: theme.warning || '#F59E0B' }]} activeOpacity={0.8} onPress={() => setIsFabOpen(false)}>
                <MaterialIcons name="emoji-events" size={24} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
            <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.fabMenuItem}>
              <Text style={[styles.fabMenuLabel, { color: theme.text, backgroundColor: theme.card }]}>Ajouter une séance</Text>
              <TouchableOpacity style={[styles.miniFab, { backgroundColor: theme.primary }]} activeOpacity={0.8} onPress={() => setIsFabOpen(false)}>
                <MaterialIcons name="directions-run" size={24} color="#FFF" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </>
      )}

      {/* Main FAB */}
      <Animated.View entering={FadeInUp.delay(500).springify()} style={[styles.fab, { backgroundColor: isFabOpen ? theme.card : theme.primary, ...Layout.shadows.medium }]}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
          onPress={() => setIsFabOpen(!isFabOpen)}
        >
          <MaterialIcons name={isFabOpen ? "close" : "add"} size={32} color={isFabOpen ? theme.text : "#FFF"} />
        </TouchableOpacity>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgBlob: {
    position: 'absolute',
    opacity: 0.015,
  },
  calendarContainer: {
    paddingVertical: Layout.spacing.sm,
  },
  calendarScroll: {
    paddingHorizontal: Layout.spacing.lg,
    gap: Layout.spacing.sm,
  },
  dayButton: {
    width: 60,
    height: 76,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: Typography.sizes.xs,
    marginBottom: 2,
  },
  dateText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: 180, // Espace pour scroller au-dessus du FAB
  },
  dayHeader: {
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  daySubtitle: {
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  dailySummaryCard: {
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    paddingVertical: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  dailySummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  dailySummaryItem: {
    alignItems: 'center',
  },
  dailySummaryValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  dailySummaryLabel: {
    fontSize: Typography.sizes.xs,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  dailySummaryDivider: {
    width: 1,
    height: 30,
  },
  timelineContainer: {
    flexDirection: 'column',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Layout.spacing.sm,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
  },
  timelineNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    marginTop: 4, // Aligner avec le texte de l'heure
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: -4,
    marginBottom: -20, // Connecte au noeud suivant
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: Layout.spacing.sm,
    paddingBottom: Layout.spacing.xl,
  },
  timeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    marginBottom: Layout.spacing.xs,
  },
  sessionCard: {
    marginTop: Layout.spacing.xs,
    padding: Layout.spacing.md, // Un peu plus compact
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  tag: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.pill,
  },
  tagText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  moreButton: {
    padding: 4,
    marginRight: -4,
  },
  sessionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: Layout.spacing.xs,
  },
  objectiveContainer: {
    marginBottom: Layout.spacing.sm,
  },
  objectiveLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
  },
  objectiveText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  sessionDesc: {
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: Layout.spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 6,
    borderRadius: Layout.borderRadius.pill,
    gap: 4,
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  actionButton: {
    marginTop: Layout.spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 90, // Relevé pour passer au-dessus de la Tab Bar
    right: Layout.spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 10,
  },
  fabMenu: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 180 : 160,
    right: Layout.spacing.xl,
    alignItems: 'flex-end',
    zIndex: 10,
    gap: Layout.spacing.md,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  fabMenuLabel: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    ...Layout.shadows.light,
  },
  miniFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Layout.shadows.medium,
  },
  monthHeaderRow: {
    paddingHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.sm,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  monthText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  monthStats: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
});
