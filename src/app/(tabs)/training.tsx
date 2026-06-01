import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { CustomButton } from '../../components/CustomButton';
import { MaterialIcons } from '@expo/vector-icons';

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
      isToday: i === 0,
      // On simule des séances au hasard pour la démo
      hasSession: Math.random() > 0.4,
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

  useEffect(() => {
    // Centrer le calendrier sur "aujourd'hui" (index 60)
    setTimeout(() => {
      const todayIndex = 60;
      const itemWidth = 60 + Layout.spacing.sm; // Largeur du bouton + gap
      const screenWidth = Layout.window.width;
      const centerOffset = (todayIndex * itemWidth) - (screenWidth / 2) + (itemWidth / 2) + Layout.spacing.lg;
      
      scrollViewRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: false });
    }, 100);
  }, []);

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
        style={StyleSheet.absoluteFillObject} 
      />
      {/* Formes subtiles pour l'aura Premium (identique à l'accueil) */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
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
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedDateId(item.id)}
                style={[
                  styles.dayButton,
                  {
                    backgroundColor: isSelected ? theme.primary : 'transparent',
                    borderColor: isSelected ? theme.primary : theme.border,
                  }
                ]}
              >
                <Text style={[styles.dayText, { color: isSelected ? '#FFF' : theme.icon }]}>{item.dayStr}</Text>
                <Text style={[styles.dateText, { color: isSelected ? '#FFF' : theme.text }]}>{item.dateStr}</Text>
                {/* Indicateur de séance */}
                <View 
                  style={[
                    styles.sessionDot, 
                    { 
                      backgroundColor: item.hasSession ? (isSelected ? '#FFF' : theme.primary) : 'transparent' 
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
            {selectedDayInfo?.hasSession ? "Jour d'entraînement" : 'Jour de repos'}
          </Text>
        </Animated.View>

        {/* Résumé du Jour (Nouvelle Carte Intelligente) */}
        {selectedDayInfo?.hasSession && (
          <Animated.View entering={FadeInUp.delay(150).springify()} style={[styles.dailySummaryCard, { borderColor: theme.border, backgroundColor: theme.card }]} key={`summary-${selectedDateId}`}>
             <View style={styles.dailySummaryRow}>
               <View style={styles.dailySummaryItem}>
                 <Text style={[styles.dailySummaryValue, { color: theme.text }]}>2</Text>
                 <Text style={[styles.dailySummaryLabel, { color: theme.icon }]}>Séances</Text>
               </View>
               <View style={[styles.dailySummaryDivider, { backgroundColor: theme.border }]} />
               <View style={styles.dailySummaryItem}>
                 <Text style={[styles.dailySummaryValue, { color: theme.text }]}>2h00</Text>
                 <Text style={[styles.dailySummaryLabel, { color: theme.icon }]}>Volume</Text>
               </View>
             </View>
          </Animated.View>
        )}
        
        {/* Container de la Timeline (Conditionnel) */}
        {selectedDayInfo?.hasSession ? (
          <View style={styles.timelineContainer} key={`timeline-${selectedDateId}`}>
            
            {/* Item 1 : Séance principale */}
            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineNode, { borderColor: theme.secondary, backgroundColor: theme.secondary }]} /> {/* Terminé = Vert plein */}
                <View style={[styles.timelineLine, { backgroundColor: theme.border }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timeText, { color: theme.icon }]}>18:00 - 19:30</Text>
                <Card elevation="none" style={[styles.sessionCard, { backgroundColor: theme.primary + '0A', borderColor: theme.primary + '20', borderWidth: 1 }]}>
                  <View style={styles.sessionHeader}>
                    <View style={[styles.tag, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.tagText, { color: theme.primary }]}>Piste</Text>
                    </View>
                    <TouchableOpacity style={styles.moreButton}>
                      <MaterialIcons name="more-vert" size={20} color={theme.icon} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.sessionTitle, { color: theme.text }]}>Vitesse & Puissance</Text>
                  
                  <View style={styles.objectiveContainer}>
                    <Text style={[styles.objectiveLabel, { color: theme.primary }]}>Objectif :</Text>
                    <Text style={[styles.objectiveText, { color: theme.text }]}>Développement de l'accélération maximale</Text>
                  </View>

                  <Text style={[styles.sessionDesc, { color: theme.icon }]}>
                    Échauffement complet, éducatifs, suivi de 4x60m et 3x80m à 95% Vmax. 
                    Fin de séance en renforcement explosif.
                  </Text>
                  
                  <View style={styles.badgesRow}>
                    <View style={[styles.badge, { backgroundColor: theme.surfaceSecondary }]}>
                      <MaterialIcons name="timer" size={16} color={theme.text} />
                      <Text style={[styles.badgeText, { color: theme.text }]}>1h30</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.danger + '20' }]}>
                      <MaterialIcons name="whatshot" size={16} color={theme.danger} />
                      <Text style={[styles.badgeText, { color: theme.danger }]}>RPE 8</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: theme.surfaceSecondary }]}>
                      <MaterialIcons name="bolt" size={16} color={theme.text} />
                      <Text style={[styles.badgeText, { color: theme.text }]}>Sprint</Text>
                    </View>
                  </View>
                  
                  <CustomButton title="Séance terminée" variant="secondary" size="small" style={styles.actionButton} />
                </Card>
              </View>
            </Animated.View>

            {/* Item 2 : Soins / Récupération (Exemple biquotidien) */}
            <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineNode, { borderColor: theme.primary, backgroundColor: theme.background }]} /> {/* A venir = Bleu vide */}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timeText, { color: theme.icon }]}>20:30 - 21:00</Text>
                <Card elevation="none" style={[styles.sessionCard, { backgroundColor: theme.secondary + '0A', borderColor: theme.secondary + '20', borderWidth: 1 }]}>
                  <View style={styles.sessionHeader}>
                    <View style={[styles.tag, { backgroundColor: theme.secondary + '20' }]}>
                      <Text style={[styles.tagText, { color: theme.secondary }]}>Récupération</Text>
                    </View>
                    <TouchableOpacity style={styles.moreButton}>
                      <MaterialIcons name="more-vert" size={20} color={theme.icon} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.sessionTitle, { color: theme.text }]}>Étirements & Massage</Text>
                  <View style={styles.objectiveContainer}>
                    <Text style={[styles.objectiveLabel, { color: theme.secondary }]}>Objectif :</Text>
                    <Text style={[styles.objectiveText, { color: theme.text }]}>Régénération musculaire et souplesse</Text>
                  </View>
                  <CustomButton title="Démarrer" size="small" style={styles.actionButton} />
                </Card>
              </View>
            </Animated.View>

          </View>
        ) : (
          <Animated.View entering={FadeInUp.delay(200).springify()} style={{ alignItems: 'center', marginTop: Layout.spacing.xxl }} key={`empty-${selectedDateId}`}>
            <MaterialIcons name="hotel" size={64} color={theme.icon} style={{ opacity: 0.5, marginBottom: Layout.spacing.md }} />
            <Text style={{ color: theme.text, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>Aucune séance prévue</Text>
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: Layout.spacing.sm }}>Profitez de ce jour de repos pour bien récupérer ou ajoutez une séance avec le bouton +</Text>
          </Animated.View>
        )}

      </ScrollView>

      {/* Menu FAB */}
      {isFabOpen && (
        <>
          <TouchableOpacity 
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9 }]} 
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
    ...Layout.shadows.small,
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
