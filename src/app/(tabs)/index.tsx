import React from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { CustomButton } from '../../components/CustomButton';
import { ActivityRings } from '../../components/ActivityRings';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <LinearGradient 
      colors={['#1E3A8A' /* placeholder if undefined */, '#1E3A8A']} // Safe fallback, overridden by theme below
      style={styles.container}
    >
      {/* Fond Dégradé Premium avec profondeur */}
      <LinearGradient 
        colors={[theme.gradientStart || '#F8FAFC', theme.gradientMiddle || '#F1F5F9', theme.gradientEnd || '#E2E8F0']}
        style={StyleSheet.absoluteFillObject} 
      />
      {/* Formes subtiles pour casser l'effet feuille blanche sans gêner la lisibilité */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={[styles.bgBlob, { top: -200, right: -200, width: 800, height: 800, borderRadius: 400, backgroundColor: theme.primary }]} />
        <View style={[styles.bgBlob, { top: 400, left: -300, width: 700, height: 700, borderRadius: 350, backgroundColor: theme.secondary }]} />
      </View>
      
      <Header
        leftContent={
          <View style={styles.headerLeft}>
            <View>
              <Text style={[styles.greeting, { color: theme.icon }]}>Salut Usain 👋</Text>
              <Text style={[styles.userName, { color: theme.text }]}>Prêt pour aujourd'hui ?</Text>
            </View>
          </View>
        }
        rightContent={<MaterialIcons name="notifications-none" size={28} color={theme.icon} />}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Main Card: Séance du jour (La plus importante) */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/training')}>
          <Card style={[styles.mainSessionCard, { padding: 0, overflow: 'hidden', borderColor: theme.primary + '20', borderWidth: 1 }]}>
             <LinearGradient
               colors={[theme.card, theme.primary + '0A']}
               style={{ padding: Layout.spacing.lg, borderLeftWidth: 4, borderLeftColor: theme.primary }}
             >
               <View style={styles.mainSessionHeader}>
                 <View style={styles.mainSessionTitleWrapper}>
                   <View style={styles.badgeContainer}>
                     <MaterialIcons name="directions-run" size={16} color={theme.primary} />
                     <Text style={[styles.mainSessionLabel, { color: theme.primary }]}>SÉANCE DU JOUR</Text>
                     <View style={[styles.badge, { backgroundColor: theme.primary }]}><Text style={styles.badgeText}>Aujourd'hui</Text></View>
                   </View>
                   {/* Pour le moment, on affiche "Vitesse & Puissance", mais si null on affichera "Jour de repos" */}
                   <Text style={[styles.mainSessionTitle, { color: theme.text }]}>Vitesse & Puissance</Text>
                 </View>
                 <MaterialIcons name="chevron-right" size={24} color={theme.icon} style={{ marginTop: 8 }} />
               </View>
               <Text style={[styles.mainSessionDesc, { color: theme.text, marginBottom: 0 }]}>
                 Piste - Sprint court • 18:00 (1h30)
               </Text>
             </LinearGradient>
          </Card>
        </TouchableOpacity>

        {/* Check-in Quotidien (Moins imposant, icône neutre) */}
        <Card style={styles.checkinCard}>
          <View style={styles.checkinHeader}>
            <MaterialIcons name="fact-check" size={28} color={theme.icon} />
            <View>
              <Text style={[styles.checkinTitle, { color: theme.text }]}>Check-in Quotidien</Text>
              <Text style={[styles.checkinDesc, { color: theme.icon }]}>Poids, sommeil, humeur</Text>
            </View>
            <View style={{ flex: 1 }} />
            <CustomButton 
              title="Check-in" 
              onPress={() => router.push('/checkin')}
              style={[styles.checkinBtnSmall, { backgroundColor: theme.primary + '15' }]} 
              textStyle={{ color: theme.primary }} 
            />
          </View>
        </Card>

        {/* Petites Cartes (Légèrement colorées) */}
        <View style={styles.smallGrid}>
          <Card style={[styles.smallCard, { backgroundColor: theme.secondary + '0C' }]}>
            <MaterialIcons name="local-fire-department" size={24} color={theme.secondary} />
            <Text style={[styles.smallCardValue, { color: theme.text }]}>1240</Text>
            <Text style={[styles.smallCardLabel, { color: theme.icon }]}>kcal rest.</Text>
          </Card>
          <Card style={[styles.smallCard, { backgroundColor: theme.primary + '0C' }]}>
            <MaterialIcons name="monitor-weight" size={24} color={theme.primary} />
            <Text style={[styles.smallCardValue, { color: theme.text }]}>74.5</Text>
            <Text style={[styles.smallCardLabel, { color: theme.icon }]}>kg</Text>
          </Card>
          <Card style={[styles.smallCard, { backgroundColor: (theme.warning || '#F59E0B') + '10' }]}>
            <MaterialIcons name="emoji-events" size={24} color={theme.warning || '#F59E0B'} />
            <Text style={[styles.smallCardValue, { color: theme.text }]}>J-14</Text>
            <Text style={[styles.smallCardLabel, { color: theme.icon }]}>Paris</Text>
          </Card>
        </View>

        {/* Résumé Semaine avec Activity Rings */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Activité Hebdomadaire</Text>
        <Card style={styles.ringsCard}>
          <View style={styles.ringsContainer}>
             <ActivityRings 
               rings={[
                 { value: 75, max: 100, color: '#F59E0B' }, // Énergie
                 { value: 2100, max: 2500, color: '#10B981' }, // Nutrition
               ]}
               size={120}
               strokeWidth={12}
             />
          </View>
          <View style={styles.ringsLegend}>
            <View style={styles.legendItem}>
               <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
               <View>
                 <Text style={[styles.legendTitle, { color: theme.text }]}>Énergie</Text>
                 <Text style={[styles.legendValue, { color: theme.icon }]}>Niveau : 75%</Text>
               </View>
            </View>
            <View style={styles.legendItem}>
               <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
               <View>
                 <Text style={[styles.legendTitle, { color: theme.text }]}>Nutrition</Text>
                 <Text style={[styles.legendValue, { color: theme.icon }]}>~2100 kcal/j</Text>
               </View>
            </View>
          </View>
        </Card>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgBlob: {
    position: 'absolute',
    opacity: 0.015, // Presque invisible, donne juste une aura
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  greeting: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  userName: {
    fontSize: Typography.sizes.xs,
  },
  scrollContent: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  checkinCard: {
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.md,
  },
  checkinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  checkinTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  checkinDesc: {
    fontSize: Typography.sizes.xs,
  },
  checkinBtnSmall: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    minHeight: 36,
  },
  mainSessionCard: {
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.lg,
  },
  mainSessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Layout.spacing.sm,
  },
  mainSessionTitleWrapper: {
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  mainSessionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: Layout.spacing.sm,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  mainSessionTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
  },
  mainSessionDesc: {
    fontSize: Typography.sizes.md,
    marginBottom: Layout.spacing.lg,
    marginTop: Layout.spacing.xs,
  },
  mainSessionBtn: {
    marginTop: Layout.spacing.xs,
  },
  smallGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  smallCard: {
    flex: 1,
    padding: Layout.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCardValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginTop: Layout.spacing.sm,
  },
  smallCardLabel: {
    fontSize: Typography.sizes.xs,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginTop: Layout.spacing.xl,
    marginBottom: Layout.spacing.sm,
  },
  ringsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  ringsContainer: {
    marginRight: Layout.spacing.lg,
  },
  ringsLegend: {
    flex: 1,
    gap: Layout.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  legendValue: {
    fontSize: Typography.sizes.xs,
  },
});
