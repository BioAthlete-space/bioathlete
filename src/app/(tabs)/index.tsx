import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { Card } from '../../components/Card';
import { CustomButton } from '../../components/CustomButton';
import { ActivityRings } from '../../components/ActivityRings';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAthleteProfile } from '../../hooks/useAthleteProfile';
import { loadCheckins } from '../../services/StorageService';
import { CheckinData } from '../../types/Checkin';
import { supabase } from '../../lib/supabase';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchWeather, WMO_CODES } from '../../services/WeatherService';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAthleteProfile();
  
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<any | null>(null);
  const [activePeriodization, setActivePeriodization] = useState<any | null>(null);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [weatherSummary, setWeatherSummary] = useState<any>(null);
  const [weatherLocationName, setWeatherLocationName] = useState<string>('Météo');
  const [weatherAlert, setWeatherAlert] = useState<string | null>(null);
  
  const [homeNutrition, setHomeNutrition] = useState({ remainingCals: 0, weight: 0 });

  const adjustWeight = async (delta: number) => {
    const currentWeight = homeNutrition.weight > 0 ? homeNutrition.weight : 70;
    const newWeight = parseFloat((currentWeight + delta).toFixed(2));
    setHomeNutrition(prev => ({ ...prev, weight: newWeight }));
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ weightkg: newWeight }).eq('id', user.id);
    }
  };

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  useEffect(() => {
    let channel: any;
    const initNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const fetchNotifs = async () => {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setNotifications(data || []);
      };
      
      fetchNotifs();
      
      channel = supabase.channel('notifs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          fetchNotifs();
        })
        .subscribe();
    };
    
    initNotifications();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleNotificationPress = async (id: string, read: boolean) => {
    if (!read) {
      await supabase.from('notifications').update({ read: true }).eq('id', id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
    setShowNotificationsModal(false);
    router.push('/training');
  };

  useFocusEffect(
    useCallback(() => {
      const fetchCheckin = async () => {
        const history = await loadCheckins();
        const today = new Date();
        const checkinId = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
        const checkin = history.find(c => c.id === checkinId);
        if (checkin) {
          setTodayScore(checkin.score);
        } else {
          setTodayScore(null);
        }
      };
      
      const fetchWorkout = async () => {
        setLoadingWorkout(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const today = new Date().toISOString().split('T')[0];
        
        // 1. Get athlete's groups
        const { data: groupsData } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('athlete_id', user.id);
        const groupIds = groupsData?.map(g => g.group_id) || [];
        
        // 2. Get athlete's subgroups
        const { data: subgroupsData } = await supabase
          .from('subgroup_members')
          .select('subgroup_id')
          .eq('athlete_id', user.id);
        const subgroupIds = subgroupsData?.map(sg => sg.subgroup_id) || [];
        
        // 3. Fetch today's workout
        const orConditions = [`athlete_id.eq.${user.id}`];
        if (groupIds.length > 0) orConditions.push(`group_id.in.(${groupIds.join(',')})`);
        
        const { data, error } = await supabase
          .from('workouts')
          .select('*')
          .eq('date', today)
          .or(orConditions.join(','));
          
        if (data) {
          const filtered = data.filter(w => {
            if (w.athlete_id === user.id) return true;
            if (w.subgroup_id && !subgroupIds.includes(w.subgroup_id)) return false;
            if (w.type === 'Compétition' && w.participant_ids && w.participant_ids.length > 0) {
              return w.participant_ids.includes(user.id);
            }
            return true;
          });
          
          if (filtered.length > 0) {
            setTodayWorkout(filtered[0]);
          } else {
            setTodayWorkout(null);
          }
        } else {
          setTodayWorkout(null);
        }
        
        // 4. Fetch Active Periodization
        if (groupIds.length > 0) {
          const { data: pData } = await supabase
            .from('coach_periodizations')
            .select('*')
            .in('group_id', groupIds)
            .lte('start_date', today)
            .gte('end_date', today)
            .limit(1)
            .maybeSingle();
            
          setActivePeriodization(pData || null);
        }

        setLoadingWorkout(false);
      };

      const loadWeatherWidget = async () => {
        try {
          const savedLocation = await AsyncStorage.getItem('saved_weather_location');
          let lat = 48.8566, lon = 2.3522, name = 'Paris';
          if (savedLocation) {
            const parsed = JSON.parse(savedLocation);
            lat = parsed.lat; lon = parsed.lon; name = parsed.name;
          } else {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              let location = await Location.getCurrentPositionAsync({});
              lat = location.coords.latitude; lon = location.coords.longitude; name = 'Ma Position';
            }
          }
          setWeatherLocationName(name);
          const data = await fetchWeather(lat, lon);
          if (data && data.weather?.current) {
            const code = data.weather.current.weathercode;
            const windspeed = data.weather.current.windspeed_10m;
            setWeatherSummary({
              temp: data.weather.current.temperature_2m,
              code,
              windspeed,
            });
            // Detect dangerous conditions
            const dangerCodes = [95, 96, 99]; // Thunderstorm
            const iceCodes = [71, 73, 75, 77]; // Snow/Sleet
            if (dangerCodes.includes(code)) {
              setWeatherAlert('⚡ Danger : Orage détecté. Entraînement en extérieur déconseillé.');
            } else if (iceCodes.includes(code)) {
              setWeatherAlert('❄️ Attention : Risque de verglas. Prudence sur les pistes.');
            } else if (windspeed > 60) {
              setWeatherAlert(`💨 Alerte Vent : ${Math.round(windspeed)} km/h. Adaptez votre séance.`);
            } else {
              setWeatherAlert(null);
            }
          }
        } catch (e) {
          console.log("Weather error", e);
        }
      };

      const fetchNutritionMetrics = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        let targetCals = 2500;
        let weight = 0;
        
        // 1. Fetch target calories
        const { data: nProfile } = await supabase.from('nutrition_profiles').select('target_calories').eq('athlete_id', user.id).maybeSingle();
        if (nProfile && nProfile.target_calories) targetCals = nProfile.target_calories;
        
        // 2. Fetch weight from profile
        const { data: pData } = await supabase.from('profiles').select('weightkg').eq('id', user.id).maybeSingle();
        if (pData && pData.weightkg) weight = pData.weightkg;
        
        // 3. Fetch consumed calories today
        const today = new Date().toISOString().split('T')[0];
        const { data: logData } = await supabase.from('nutrition_logs').select('total_calories').eq('user_id', user.id).eq('log_date', today).maybeSingle();
        
        const consumed = logData && logData.total_calories ? logData.total_calories : 0;
        
        setHomeNutrition({
          remainingCals: Math.max(0, targetCals - consumed),
          weight: weight
        });
      };

      fetchCheckin();
      fetchWorkout();
      loadWeatherWidget();
      fetchNutritionMetrics();
    }, [])
  );

  return (
    <LinearGradient 
      colors={['#1E3A8A' /* placeholder if undefined */, '#1E3A8A']} // Safe fallback, overridden by theme below
      style={styles.container}
    >
      {/* Fond Dégradé Premium avec profondeur */}
      <LinearGradient 
        colors={[theme.gradientStart || '#F8FAFC', theme.gradientMiddle || '#F1F5F9', theme.gradientEnd || '#E2E8F0']}
        style={StyleSheet.absoluteFill} 
      />
      {/* Formes subtiles pour casser l'effet feuille blanche sans gêner la lisibilité */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[styles.bgBlob, { top: -200, right: -200, width: 800, height: 800, borderRadius: 400, backgroundColor: theme.primary }]} />
        <View style={[styles.bgBlob, { top: 400, left: -300, width: 700, height: 700, borderRadius: 350, backgroundColor: theme.secondary }]} />
      </View>
      
      <Header
        leftContent={
          <View style={styles.headerLeft}>
            <Text style={{ fontSize: 22, fontWeight: '600', color: theme.text, letterSpacing: -0.5 }}>
              Salut {profile.firstname || 'Athlète'}
            </Text>
          </View>
        }
        rightContent={
          <TouchableOpacity style={{ position: 'relative' }} onPress={() => setShowNotificationsModal(true)}>
            <MaterialIcons name="notifications-none" size={28} color={theme.icon} />
            {notifications.filter(n => !n.read).length > 0 && (
              <View style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: theme.background }} />
            )}
          </TouchableOpacity>
        }
      />
      
      <Modal visible={showNotificationsModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.background, height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <MaterialIcons name="notifications-off" size={48} color={theme.border} />
                  <Text style={{ color: theme.icon, marginTop: 10 }}>Aucune notification.</Text>
                </View>
              ) : (
                notifications.map(n => (
                  <TouchableOpacity 
                    key={n.id} 
                    style={{ 
                      backgroundColor: n.read ? theme.card : theme.primary + '10', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 10,
                      borderLeftWidth: n.read ? 0 : 4,
                      borderLeftColor: theme.primary
                    }}
                    onPress={() => handleNotificationPress(n.id, n.read)}
                  >
                    <Text style={{ fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>{n.title}</Text>
                    <Text style={{ color: theme.icon }}>{n.body}</Text>
                    <Text style={{ color: theme.icon, fontSize: 10, marginTop: 8, opacity: 0.7 }}>
                      {new Date(n.created_at).toLocaleDateString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* WEATHER ALERT BANNER */}
        {weatherAlert && (
          <View style={{ backgroundColor: '#EF4444', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="warning" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13, flex: 1 }}>{weatherAlert}</Text>
          </View>
        )}
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/checkin')}>
          <Card style={[styles.checkinCard, { padding: 24, marginBottom: 20 }]}>
            {todayScore !== null ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginRight: 24 }}>
                  <ActivityRings 
                    rings={[{ 
                      value: todayScore, 
                      max: 100, 
                      color: todayScore <= 40 ? '#EF4444' : todayScore <= 70 ? '#F59E0B' : '#10B981' 
                    }]}
                    size={90}
                    strokeWidth={8}
                  />
                  <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: theme.text }}>{todayScore}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.icon, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>État de forme</Text>
                  <Text style={{ fontSize: 16, color: theme.text, fontWeight: '600' }}>
                    {todayScore >= 70 ? "Prêt à performer" : todayScore >= 40 ? "Modéré aujourd'hui" : "Repos conseillé"}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ position: 'relative', width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginRight: 24 }}>
                  <ActivityRings 
                    rings={[{ value: 0, max: 100, color: theme.primary }]}
                    size={90}
                    strokeWidth={8}
                  />
                  <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialIcons name="add" size={32} color={theme.icon} />
                  </View>
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, color: theme.icon, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>État de forme</Text>
                  <View style={{ backgroundColor: theme.primary, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Faire mon check-in</Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </TouchableOpacity>

        {/* 2. MÉTÉO ENRICHIE */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/weather')}>
          <Card style={{ padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 20, backgroundColor: theme.card, borderColor: theme.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialIcons name="location-on" size={16} color={theme.primary} />
                  <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 4, fontSize: 16 }}>{weatherLocationName}</Text>
                </View>
                {weatherSummary ? (
                  <Text style={{ color: theme.icon, fontSize: 14, fontWeight: '500' }}>
                    Vent : {Math.round(weatherSummary.windspeed || 0)} km/h • {WMO_CODES[weatherSummary.code]?.label || 'Variables'}
                  </Text>
                ) : (
                  <Text style={{ color: theme.icon, fontSize: 14 }}>Analyse des conditions...</Text>
                )}
              </View>

              {weatherSummary ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginRight: 8 }}>{WMO_CODES[weatherSummary.code]?.icon || '🌤'}</Text>
                  <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 26 }}>{Math.round(weatherSummary.temp)}°</Text>
                  <MaterialIcons name="chevron-right" size={24} color={theme.icon} style={{ marginLeft: 8 }} />
                </View>
              ) : (
                <ActivityIndicator size="small" color={theme.primary} />
              )}
            </View>
          </Card>
        </TouchableOpacity>

        {/* 3. SÉANCE DU JOUR */}
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/training')}>
          <Card style={[styles.mainSessionCard, { padding: 0, overflow: 'hidden', borderColor: theme.primary + '20', borderWidth: 1, marginBottom: 20 }]}>
             <LinearGradient
               colors={[theme.card, theme.primary + '0A']}
               style={{ padding: Layout.spacing.lg, borderLeftWidth: 4, borderLeftColor: theme.primary }}
             >
               <View style={styles.mainSessionHeader}>
                 <View style={styles.mainSessionTitleWrapper}>
                   <View style={styles.badgeContainer}>
                     <MaterialIcons name="directions-run" size={16} color={theme.primary} />
                     <Text style={[styles.mainSessionLabel, { color: theme.primary }]}>SÉANCE DU JOUR</Text>
                     {activePeriodization && (
                       <View style={[styles.badge, { backgroundColor: activePeriodization.color }]}><Text style={styles.badgeText}>{activePeriodization.name}</Text></View>
                     )}
                   </View>
                   {loadingWorkout ? (
                     <ActivityIndicator size="small" color={theme.primary} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
                   ) : (
                     <Text style={[styles.mainSessionTitle, { color: theme.text }]}>
                       {todayWorkout ? todayWorkout.title : "Jour de repos"}
                     </Text>
                   )}
                 </View>
                 <MaterialIcons name="chevron-right" size={24} color={theme.icon} style={{ marginTop: 8 }} />
               </View>
               {!loadingWorkout && (
                 <Text style={[styles.mainSessionDesc, { color: theme.icon, marginBottom: 0 }]}>
                   {todayWorkout ? (
                     `${todayWorkout.type || 'Séance'} • ${todayWorkout.start_time ? todayWorkout.start_time.substring(0,5) : 'Heure libre'} ${todayWorkout.duration_minutes ? `(${todayWorkout.duration_minutes}min)` : ''}`
                   ) : (
                     "Profitez-en pour bien récupérer."
                   )}
                 </Text>
               )}
             </LinearGradient>
          </Card>
        </TouchableOpacity>

        {/* 4. PETITES CARTES AGRANDIES */}
        <View style={styles.smallGrid}>
          <Card style={[styles.smallCard, { backgroundColor: theme.secondary + '0C', paddingVertical: 24 }]}>
            <MaterialIcons name="local-fire-department" size={32} color={theme.secondary} />
            <Text style={[styles.smallCardValue, { color: theme.text, fontSize: 26, marginTop: 8 }]}>{homeNutrition.remainingCals}</Text>
            <Text style={[styles.smallCardLabel, { color: theme.icon, fontSize: 14 }]}>kcal rest.</Text>
          </Card>
          
          <Card style={[styles.smallCard, { backgroundColor: theme.primary + '0C', paddingVertical: 16, justifyContent: 'center' }]}>
            <MaterialIcons name="monitor-weight" size={24} color={theme.primary} style={{ marginBottom: 4 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <TouchableOpacity onPress={() => adjustWeight(-0.05)} style={{ padding: 8 }}>
                <MaterialIcons name="remove-circle-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', marginHorizontal: 4 }}>
                <Text style={[styles.smallCardValue, { color: theme.text, fontSize: 26 }]}>{homeNutrition.weight > 0 ? homeNutrition.weight.toFixed(2) : '--'}</Text>
                <Text style={[styles.smallCardLabel, { color: theme.icon, fontSize: 12 }]}>kg</Text>
              </View>
              <TouchableOpacity onPress={() => adjustWeight(0.05)} style={{ padding: 8 }}>
                <MaterialIcons name="add-circle-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </Card>
        </View>


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

