import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Dimensions, Animated, TouchableWithoutFeedback, Platform, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../hooks/useThemeColor';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import { supabase } from '../../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Calendar, LocaleConfig } from 'react-native-calendars';

LocaleConfig.locales['fr'] = {
  monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  monthNamesShort: ['Janv.','Févr.','Mars','Avril','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
  dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
  dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
  today: "Aujourd'hui"
};
LocaleConfig.defaultLocale = 'fr';

const { width } = Dimensions.get('window');

// Utilitaire pour avoir le lundi de la semaine d'une date
const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const CompetitionCard = ({ w, theme, onPress }: any) => {
  const moveAnim1 = useRef(new Animated.Value(0)).current;
  const moveAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Brume 1 (Orange/Or)
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim1, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(moveAnim1, { toValue: 0, duration: 6000, useNativeDriver: true })
      ])
    ).start();

    // Brume 2 (Violet)
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim2, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(moveAnim2, { toValue: 0, duration: 8000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const transX1 = moveAnim1.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] });
  const transY1 = moveAnim1.interpolate({ inputRange: [0, 1], outputRange: [-20, 10] });

  const transX2 = moveAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const transY2 = moveAnim2.interpolate({ inputRange: [0, 1], outputRange: [10, -20] });

  return (
    <TouchableOpacity onPress={onPress} style={[styles.workoutCard, { backgroundColor: theme.card, borderLeftColor: '#F59E0B', overflow: 'hidden' }]}>
      
      {/* Brume 1 */}
      <Animated.View style={[{ position: 'absolute', top: -50, left: -50, width: '200%', height: '200%', transform: [{ translateX: transX1 }, { translateY: transY1 }] }]}>
        <LinearGradient
          colors={['rgba(245, 158, 11, 0.35)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Brume 2 */}
      <Animated.View style={[{ position: 'absolute', top: -50, left: -50, width: '200%', height: '200%', transform: [{ translateX: transX2 }, { translateY: transY2 }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(139, 92, 246, 0.25)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={{ zIndex: 1 }}>
        <Text style={[styles.workoutTitle, { color: theme.text }]}>{w.title}</Text>
        <Text style={[styles.workoutSubtitle, { color: theme.icon }]} numberOfLines={2}>
          🏆 {w.competition_type || 'Compétition'} {w.location ? `• ${w.location}` : ''}
          {w.participant_ids?.length > 0 ? `\n👤 ${w.participant_ids.length} athlète(s)` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getEffortSummary = (ex: any) => {
  return [
    ex.sets ? `${ex.sets} séries` : null,
    ex.reps ? `${ex.reps} reps` : null,
    ex.duration ? `durée: ${ex.duration}` : null,
    ex.distance ? `dist: ${ex.distance}` : null,
    ex.charge ? `charge: ${ex.charge}` : null,
    ex.rest ? `récup: ${ex.rest}` : null
  ].filter(Boolean).join(' • ');
};

export default function PlanningCalendarScreen() {
  const theme = useTheme();

  // State Date
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // State Data
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [periodizations, setPeriodizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Hamburger Menu
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const hamburgerAnim = useRef(new Animated.Value(0)).current;

  const toggleHamburgerMenu = () => {
    if (showHamburgerMenu) {
      closeHamburgerMenu();
    } else {
      setShowHamburgerMenu(true);
      Animated.timing(hamburgerAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeHamburgerMenu = () => {
    Animated.timing(hamburgerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setShowHamburgerMenu(false));
  };

  // Modal Periodization
  const [showPeriModal, setShowPeriModal] = useState(false);
  const [periName, setPeriName] = useState('');
  const [periColor, setPeriColor] = useState('#1E3A8A'); // Default blue
  const [periStartStr, setPeriStartStr] = useState<string | null>(null);
  const [periEndStr, setPeriEndStr] = useState<string | null>(null);
  const [savingPeri, setSavingPeri] = useState(false);

  // Add Action Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAddDate, setSelectedAddDate] = useState<string | null>(null);
  
  // Rest Day Modal
  const [showRestModal, setShowRestModal] = useState(false);
  const [restComment, setRestComment] = useState('');
  const [savingRest, setSavingRest] = useState(false);

  // Competition Modal
  const [showCompModal, setShowCompModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [compDescription, setCompDescription] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compLink, setCompLink] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [compType, setCompType] = useState<'Meeting' | 'Championnat'>('Meeting');
  const [compAssignment, setCompAssignment] = useState<'all' | 'specific'>('all');
  const [compSelectedAthletes, setCompSelectedAthletes] = useState<string[]>([]);
  const [savingComp, setSavingComp] = useState(false);
  
  const [groupAthletes, setGroupAthletes] = useState<any[]>([]);

  // Edit / Delete Workout
  const [selectedEditWorkout, setSelectedEditWorkout] = useState<any>(null);
  const [showWorkoutActionSheet, setShowWorkoutActionSheet] = useState(false);

  // Library Modal
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const fetchTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('workout_templates').select('*').eq('coach_id', user.id).order('created_at', { ascending: false });
    if (data) setTemplates(data);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDayPress = (day: any) => {
    if (!periStartStr || (periStartStr && periEndStr)) {
      setPeriStartStr(day.dateString);
      setPeriEndStr(null);
    } else if (periStartStr && !periEndStr) {
      if (day.dateString < periStartStr) {
        setPeriStartStr(day.dateString);
      } else {
        setPeriEndStr(day.dateString);
      }
    }
  };

  const getMarkedDates = () => {
    const marked: any = {};
    if (periStartStr) {
      marked[periStartStr] = { startingDay: true, color: periColor, textColor: 'white' };
    }
    if (periStartStr && periEndStr) {
      marked[periEndStr] = { endingDay: true, color: periColor, textColor: 'white' };
      
      let curr = new Date(periStartStr);
      curr.setDate(curr.getDate() + 1);
      const end = new Date(periEndStr);
      while (curr < end) {
        const dStr = curr.toISOString().split('T')[0];
        marked[dStr] = { color: periColor + '40', textColor: theme.text };
        curr.setDate(curr.getDate() + 1);
      }
    }
    return marked;
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (selectedGroupId) {
        fetchWeekData();
        fetchGroupAthletes();
      }
    }, [currentDate, selectedGroupId])
  );

  const fetchGroupAthletes = async () => {
    if (!selectedGroupId) return;
    const { data, error } = await supabase
      .from('group_members')
      .select('profiles(id, firstname, lastname)')
      .eq('group_id', selectedGroupId);
      
    console.log("FETCH_GROUP_ATHLETES group:", selectedGroupId);
    console.log("FETCH_GROUP_ATHLETES data:", JSON.stringify(data));
    console.log("FETCH_GROUP_ATHLETES error:", error);

    if (data) {
      setGroupAthletes(data.map(d => d.profiles).filter(Boolean));
    } else {
      setGroupAthletes([]);
    }
  };

  const fetchGroups = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('coach_groups')
      .select('*')
      .eq('coach_id', user.id);

    if (data && data.length > 0) {
      setGroups(data);
      setSelectedGroupId(data[0].id);
    } else {
      setLoading(false);
    }
  };

  const fetchWeekData = async () => {
    setLoading(true);
    const monday = getMonday(currentDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const startStr = monday.toISOString().split('T')[0];
    const endStr = sunday.toISOString().split('T')[0];

    // Fetch Workouts
    const { data: wData } = await supabase
      .from('workouts')
      .select('*')
      .eq('group_id', selectedGroupId)
      .gte('date', startStr)
      .lte('date', endStr);
      
    if (wData) setWorkouts(wData);

    // Fetch Periodizations that overlap with this week
    const { data: pData } = await supabase
      .from('coach_periodizations')
      .select('*')
      .eq('group_id', selectedGroupId)
      .lte('start_date', endStr)
      .gte('end_date', startStr);

    if (pData) setPeriodizations(pData);
    
    setLoading(false);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleAddPress = (dateStr: string) => {
    setSelectedEditWorkout(null);
    const dayWorkouts = workouts.filter(w => w.date === dateStr);
    if (dayWorkouts.some(w => w.type === 'Repos')) {
      Alert.alert('Jour de repos', 'Ce jour est marqué comme jour de repos. Êtes-vous sûr de vouloir ajouter une autre activité ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: () => {
          setSelectedAddDate(dateStr);
          setShowAddModal(true);
        }}
      ]);
    } else {
      setSelectedAddDate(dateStr);
      setShowAddModal(true);
    }
  };

  const handleActionChoice = (type: 'workout_gateway' | 'competition' | 'rest') => {
    setShowAddModal(false);
    if (!selectedAddDate) return;
    
    if (type === 'workout_gateway') {
      setTimeout(() => setShowLibraryModal(true), 400);
    } else if (type === 'competition') {
      setCompName('');
      setCompAddress('');
      setCompLink('');
      setCompType('Meeting');
      setCompAssignment('all');
      setCompSelectedAthletes([]);
      setTimeout(() => setShowCompModal(true), 400); // Wait for Add Modal to close
    } else if (type === 'rest') {
      setRestComment('');
      setTimeout(() => {
        const dayWorkouts = workouts.filter(w => w.date === selectedAddDate);
        if (dayWorkouts.some(w => w.type !== 'Repos')) {
          Alert.alert('Attention', 'Vous avez déjà des séances ou compétitions prévues ce jour-là. Voulez-vous vraiment le définir comme repos ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Continuer', onPress: () => setShowRestModal(true) }
          ]);
        } else {
          setShowRestModal(true);
        }
      }, 400);
    }
  };

  const searchAddress = async (query: string) => {
    setCompAddress(query);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (query.length < 3) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
      return;
    }

    setIsSearchingAddress(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`, {
          headers: {
            'User-Agent': 'Bioathlete/1.0'
          }
        });
        const data = await res.json();
        setAddressSuggestions(data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 800);
  };

  const handleUploadPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const file = result.assets[0];
      
      Alert.alert("Envoi en cours", "Le PDF est en cours de téléchargement...");
      
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const fileName = `competitions/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { data, error } = await supabase.storage.from('media').upload(fileName, blob, {
        contentType: 'application/pdf'
      });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      
      setCompLink(publicUrl);
      Alert.alert("Succès", "Le PDF a été importé avec succès. Il sera attaché à la compétition.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur", "Impossible d'importer le fichier : " + e.message);
    }
  };

  const saveCompetition = async () => {
    if (!selectedAddDate || !selectedGroupId || !compName) {
      Alert.alert('Erreur', 'Veuillez renseigner le nom de la compétition.');
      return;
    }
    setSavingComp(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const participantIds = compAssignment === 'specific' ? compSelectedAthletes : null;
    if (compAssignment === 'specific' && participantIds?.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un athlète.');
      setSavingComp(false);
      return;
    }

    const payload = {
      coach_id: user?.id,
      group_id: selectedGroupId,
      date: selectedAddDate,
      title: compName,
      type: 'Compétition',
      description: compDescription,
      location: compAddress,
      link_url: compLink,
      competition_type: compType,
      participant_ids: participantIds,
      duration_minutes: 0
    };

    let error;
    if (selectedEditWorkout) {
      const { error: err } = await supabase.from('workouts').update(payload).eq('id', selectedEditWorkout.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('workouts').insert(payload);
      error = err;
    }
      
    setSavingComp(false);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setShowCompModal(false);
      setSelectedEditWorkout(null);
      setCompName('');
      setCompDescription('');
      setCompAddress('');
      setCompLink('');
      setCompSelectedAthletes([]);
      setCompAssignment('all');
      fetchWeekData();
    }
  };

  const saveRestDay = async () => {
    if (!selectedAddDate || !selectedGroupId) return;
    setSavingRest(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      coach_id: user?.id,
      group_id: selectedGroupId,
      date: selectedAddDate,
      title: 'Jour de repos',
      type: 'Repos',
      description: restComment || 'Profitez-en pour bien récupérer.',
      duration_minutes: 0
    };

    let error;
    if (selectedEditWorkout) {
      const { error: err } = await supabase.from('workouts').update(payload).eq('id', selectedEditWorkout.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('workouts').insert(payload);
      error = err;
    }
      
    setSavingRest(false);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setShowRestModal(false);
      setSelectedEditWorkout(null);
      setRestComment('');
      fetchWeekData();
    }
  };

  const savePeriodization = async () => {
    if (!periName || !selectedGroupId || !periStartStr || !periEndStr) {
      Alert.alert('Erreur', 'Veuillez renseigner un nom et sélectionner une plage de dates sur le calendrier.');
      return;
    }
    setSavingPeri(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('coach_periodizations')
      .insert({
        coach_id: user?.id,
        group_id: selectedGroupId,
        name: periName,
        color: periColor,
        start_date: periStartStr,
        end_date: periEndStr,
      });
      
    setSavingPeri(false);
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setShowPeriModal(false);
      setPeriName('');
      fetchWeekData();
    }
  };

  const handleCreateFromScratch = () => {
    setShowLibraryModal(false);
    router.push({
      pathname: '/sessions/create',
      params: { calendarDate: selectedAddDate, groupId: selectedGroupId }
    });
  };

  const handleSelectTemplate = async (template: any) => {
    setShowLibraryModal(false);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('workouts').insert({
      coach_id: user?.id,
      group_id: selectedGroupId,
      date: selectedAddDate,
      title: template.name,
      type: template.type,
      content: template.content,
      duration_minutes: 0
    });
    
    if (error) {
      Alert.alert('Erreur', error.message);
      setLoading(false);
    } else {
      fetchWeekData();
    }
  };

  const handleWorkoutPress = (w: any) => {
    setSelectedEditWorkout(w);
    setShowWorkoutActionSheet(true);
  };

  // Generate Week Days
  const monday = getMonday(currentDate);
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  
  const monthName = monday.toLocaleString('fr-FR', { month: 'long' });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        title="Calendrier"
        rightContent={
          <TouchableOpacity onPress={toggleHamburgerMenu} style={{ padding: 8 }}>
            <MaterialIcons name="menu" size={28} color={theme.text} />
          </TouchableOpacity>
        }
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
        {/* Sélecteur de Groupe */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {groups.map(g => (
            <TouchableOpacity 
              key={g.id} 
              style={[styles.pill, { backgroundColor: selectedGroupId === g.id ? theme.primary : theme.border }]}
              onPress={() => setSelectedGroupId(g.id)}
            >
              <Text style={{ color: selectedGroupId === g.id ? 'white' : theme.text, fontWeight: '600' }}>{g.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        {/* Navigation Semaine */}
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={handlePrevWeek} style={styles.navBtn}>
            <MaterialIcons name="chevron-left" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: theme.text }]}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {monday.getFullYear()}
          </Text>
          <TouchableOpacity onPress={handleNextWeek} style={styles.navBtn}>
            <MaterialIcons name="chevron-right" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1 }} />
      ) : (
        <ScrollView style={styles.calendarContainer}>
          {/* Bandeaux de Périodisation */}
          <View style={styles.periodizationContainer}>
            {periodizations.map(peri => (
              <View key={peri.id} style={[styles.periBand, { backgroundColor: peri.color + '15', borderLeftColor: peri.color }]}>
                <Text style={[styles.periText, { color: peri.color }]}>{peri.name}</Text>
              </View>
            ))}
          </View>
          
          {/* Grille des Jours (Verticale pour mobile) */}
          <View style={styles.daysList}>
            {weekDays.map((dateObj, i) => {
              const dateStr = dateObj.toISOString().split('T')[0];
              const dayWorkouts = workouts.filter(w => w.date === dateStr);
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const dayName = dateObj.toLocaleString('fr-FR', { weekday: 'short' }).toUpperCase();
              const dayNumber = dateObj.getDate();
              
              const activePeri = periodizations.find(p => dateStr >= p.start_date && dateStr <= p.end_date);
              const rowBgColor = activePeri ? activePeri.color + '0C' : 'transparent'; // 0C = ~8% opacity

              return (
                <View key={dateStr} style={[styles.dayRow, { borderBottomColor: theme.border, backgroundColor: rowBgColor, borderRadius: activePeri ? 16 : 0, paddingHorizontal: activePeri ? 8 : 0, marginVertical: activePeri ? 4 : 0 }]}>
                  <View style={styles.dayHeader}>
                    <Text style={[styles.dayName, { color: isToday ? theme.primary : (activePeri ? activePeri.color : theme.icon) }]}>{dayName}</Text>
                    <Text style={[styles.dayNumber, { color: isToday ? theme.primary : (activePeri ? activePeri.color : theme.text) }]}>{dayNumber}</Text>
                  </View>
                  
                  <View style={styles.dayContent}>
                    {dayWorkouts.map(w => {
                      if (w.type === 'Compétition') {
                        return <CompetitionCard key={w.id} w={w} theme={theme} onPress={() => handleWorkoutPress(w)} />;
                      }
                      return (
                        <TouchableOpacity key={w.id} style={[styles.workoutCard, { backgroundColor: theme.card, borderLeftColor: w.type === 'Repos' ? theme.border : '#3B82F6' }]} onPress={() => handleWorkoutPress(w)}>
                          <Text style={[styles.workoutTitle, { color: theme.text }]}>{w.title}</Text>
                          {w.type === 'Repos' ? (
                            <Text style={[styles.workoutSubtitle, { color: theme.icon }]} numberOfLines={2}>🛌 {w.description}</Text>
                          ) : (
                            <Text style={[styles.workoutSubtitle, { color: theme.icon }]}>{w.type}</Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    
                    <TouchableOpacity 
                      style={[styles.addWorkoutBtn, { backgroundColor: theme.background }]}
                      onPress={() => handleAddPress(dateStr)}
                    >
                      <MaterialIcons name="add" size={18} color={theme.icon} />
                      <Text style={{ color: theme.icon, fontSize: 13, fontWeight: '500', marginLeft: 4 }}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* Modal Périodisation */}
      <Modal visible={showPeriModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Nouvelle Périodisation</Text>
              <TouchableOpacity onPress={() => setShowPeriModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={{ backgroundColor: theme.primary + '15', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="groups" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: theme.primary, fontSize: 13, flex: 1 }}>
                  Cette période s'appliquera au groupe : <Text style={{ fontWeight: 'bold' }}>{groups.find(g => g.id === selectedGroupId)?.name}</Text>
                </Text>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Nom de la période</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="Ex: Cycle Force Max"
                placeholderTextColor={theme.icon}
                value={periName}
                onChangeText={setPeriName}
              />

              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Dates de la période</Text>
              <Text style={{ color: theme.icon, fontSize: 12, marginBottom: 8 }}>Sélectionnez le début puis la fin</Text>
              <Calendar
                markingType={'period'}
                markedDates={getMarkedDates()}
                onDayPress={handleDayPress}
                theme={{
                  calendarBackground: theme.background,
                  textSectionTitleColor: theme.text,
                  dayTextColor: theme.text,
                  todayTextColor: theme.primary,
                  monthTextColor: theme.text,
                  arrowColor: theme.primary,
                }}
                style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}
              />

              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Couleur</Text>
              <View style={styles.colorRow}>
                {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map(c => (
                  <TouchableOpacity 
                    key={c} 
                    style={[styles.colorCircle, { backgroundColor: c, borderWidth: periColor === c ? 3 : 0, borderColor: theme.text }]}
                    onPress={() => setPeriColor(c)}
                  />
                ))}
              </View>

              <CustomButton 
                title={savingPeri ? "Enregistrement..." : "Créer la Période"} 
                onPress={savePeriodization}
                style={{ marginTop: 30 }}
                disabled={savingPeri}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Action Sheet Modale (Ajouter) */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <TouchableOpacity style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.actionSheetContent, { backgroundColor: theme.card, width: '85%' }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 20, textAlign: 'center' }}>Que souhaitez-vous ajouter ?</Text>
            
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.primary + '15' }]} onPress={() => handleActionChoice('workout_gateway')}>
              <MaterialIcons name="fitness-center" size={24} color={theme.primary} />
              <Text style={[styles.actionButtonText, { color: theme.primary }]}>Ajouter une séance</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F59E0B' + '15' }]} onPress={() => handleActionChoice('competition')}>
              <MaterialIcons name="emoji-events" size={24} color="#F59E0B" />
              <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Ajouter une compétition</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.border }]} onPress={() => handleActionChoice('rest')}>
              <MaterialIcons name="bed" size={24} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>Définir un jour de repos</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Aperçu d'une Séance (Overview Modal) */}
      <Modal visible={showWorkoutActionSheet} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {selectedEditWorkout?.type === 'Repos' ? '🛌 Jour de repos' : 
                 selectedEditWorkout?.type === 'Compétition' ? '🏆 Compétition' : 
                 selectedEditWorkout?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowWorkoutActionSheet(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} contentContainerStyle={{ paddingBottom: 20 }}>
              {selectedEditWorkout?.type === 'Repos' && (
                <View style={{ marginTop: 20, alignItems: 'center' }}>
                  <MaterialIcons name="hotel" size={64} color={theme.icon} style={{ opacity: 0.5, marginBottom: 20 }} />
                  <Text style={{ fontSize: 16, color: theme.text, textAlign: 'center' }}>
                    {selectedEditWorkout?.description || 'Aucun commentaire.'}
                  </Text>
                </View>
              )}

              {selectedEditWorkout?.type === 'Compétition' && (
                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 10 }}>{selectedEditWorkout?.title}</Text>
                  
                  {selectedEditWorkout?.location ? (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}
                      onPress={() => {
                        const mapUrl = Platform.select({
                          ios: `http://maps.apple.com/?q=${encodeURIComponent(selectedEditWorkout.location)}`,
                          android: `geo:0,0?q=${encodeURIComponent(selectedEditWorkout.location)}`,
                          default: `https://maps.google.com/?q=${encodeURIComponent(selectedEditWorkout.location)}`
                        });
                        if (mapUrl) Linking.openURL(mapUrl).catch(() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(selectedEditWorkout.location)}`));
                      }}
                    >
                      <Text style={{ fontSize: 16, color: theme.icon }}>📍 </Text>
                      <Text style={{ fontSize: 16, color: theme.primary, textDecorationLine: 'underline', flex: 1 }}>Ouvrir l'itinéraire ({selectedEditWorkout.location})</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={{ fontSize: 16, color: theme.icon, marginBottom: 5 }}>📍 Lieu non défini</Text>
                  )}
                  
                  {selectedEditWorkout?.competition_type ? (
                    <Text style={{ fontSize: 16, color: theme.icon, marginBottom: 5 }}>🏷️ {selectedEditWorkout.competition_type}</Text>
                  ) : null}
                  
                  {selectedEditWorkout?.type === 'Compétition' && (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}
                      onPress={() => {
                        let url = selectedEditWorkout?.link_url;
                        if (!url || url.trim() === '' || url.startsWith('/') || url.includes('/main.html/html.aspx') || url.includes('asp.net/main.html')) {
                          url = `https://www.google.com/search?q=${encodeURIComponent((selectedEditWorkout?.title || "") + " " + (selectedEditWorkout?.location || "") + " horaires athlétisme")}`;
                        } else if (!url.startsWith('http')) {
                          url = 'https://' + url;
                        }
                        Linking.openURL(url).catch(console.error);
                      }}
                    >
                      <Text style={{ fontSize: 16, color: theme.primary }}>
                        {selectedEditWorkout?.link_url?.toLowerCase().includes('.pdf') ? "📄 " : "🔗 "}
                      </Text>
                      <Text style={{ fontSize: 16, color: theme.primary, textDecorationLine: 'underline', flex: 1 }}>
                        {selectedEditWorkout?.link_url 
                          ? (selectedEditWorkout.link_url.toLowerCase().includes('.pdf') ? "Ouvrir le document PDF" : "Lien officiel de l'événement") 
                          : "Rechercher les horaires sur le web"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {(!['Repos', 'Compétition'].includes(selectedEditWorkout?.type)) && selectedEditWorkout?.content?.items && (
                <View style={{ marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.primary + '20' }}>
                      <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{selectedEditWorkout?.type}</Text>
                    </View>
                  </View>
                  
                  {selectedEditWorkout.content.items.map((item: any, index: number) => {
                    let dotColor = theme.primary;
                    if (item.itemType === 'note') dotColor = '#D97706';
                    if (item.itemType === 'title') dotColor = theme.text;

                    return (
                      <View key={item.id || index} style={{ flexDirection: 'row', marginBottom: 4 }}>
                        <View style={{ width: 30, alignItems: 'center' }}>
                          <View style={{ width: 2, height: 16, backgroundColor: index === 0 ? 'transparent' : theme.border }} />
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor, zIndex: 2 }} />
                          <View style={{ width: 2, flex: 1, backgroundColor: index === selectedEditWorkout.content.items.length - 1 ? 'transparent' : theme.border }} />
                        </View>
                        <View style={{ flex: 1, paddingBottom: 16, paddingTop: 12 }}>
                          {item.itemType === 'title' ? (
                            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>{item.value}</Text>
                          ) : item.itemType === 'note' ? (
                            <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }}>
                              <Text style={{ color: '#92400E' }}>💡 {item.value}</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: theme.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
                              <Text style={{ fontWeight: 'bold', color: theme.text }}>{getEffortSummary(item)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: theme.border, gap: 12 }}>
              <TouchableOpacity style={[styles.actionButton, { flex: 1, backgroundColor: '#EF4444' + '15', marginBottom: 0, justifyContent: 'center' }]} onPress={() => {
                const deleteAction = async () => {
                  if (!selectedEditWorkout) return;
                  const { error } = await supabase.from('workouts').delete().eq('id', selectedEditWorkout.id);
                  if (error) {
                    Alert.alert('Erreur', error.message);
                  } else {
                    setSelectedEditWorkout(null);
                    setShowWorkoutActionSheet(false);
                    fetchWeekData();
                  }
                };

                if (Platform.OS === 'web') {
                  if (window.confirm('Voulez-vous vraiment supprimer cette activité ?')) {
                    deleteAction();
                  }
                } else {
                  setShowWorkoutActionSheet(false);
                  setTimeout(() => {
                    Alert.alert('Supprimer', 'Voulez-vous vraiment supprimer cette activité ?', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: deleteAction }
                    ]);
                  }, 400);
                }
              }}>
                <MaterialIcons name="delete" size={24} color="#EF4444" />
                <Text style={{ color: '#EF4444', fontWeight: 'bold', marginLeft: 8 }}>Supprimer</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, { flex: 1, backgroundColor: theme.primary, marginBottom: 0, justifyContent: 'center' }]} onPress={() => {
                setShowWorkoutActionSheet(false);
                if (selectedEditWorkout?.type === 'Repos') {
                  setRestComment(selectedEditWorkout.description || '');
                  setSelectedAddDate(selectedEditWorkout.date);
                  setTimeout(() => setShowRestModal(true), 400);
                } else if (selectedEditWorkout?.type === 'Compétition') {
                  setCompName(selectedEditWorkout.title || '');
                  setCompDescription(selectedEditWorkout.description || '');
                  setCompAddress(selectedEditWorkout.location || '');
                  setCompLink(selectedEditWorkout.link_url || '');
                  setCompType(selectedEditWorkout.competition_type || 'Meeting');
                  setCompAssignment(selectedEditWorkout.participant_ids ? 'specific' : 'all');
                  setCompSelectedAthletes(selectedEditWorkout.participant_ids || []);
                  setSelectedAddDate(selectedEditWorkout.date);
                  setTimeout(() => setShowCompModal(true), 400);
                } else {
                  router.push({
                    pathname: '/sessions/create',
                    params: { calendarEditId: selectedEditWorkout?.id, calendarDate: selectedEditWorkout?.date, groupId: selectedGroupId }
                  });
                }
              }}>
                <MaterialIcons name="edit" size={24} color="#FFF" />
                <Text style={{ color: '#FFF', fontWeight: 'bold', marginLeft: 8 }}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale Compétition */}
      <Modal visible={showCompModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, minHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Nouvelle Compétition</Text>
              <TouchableOpacity onPress={() => setShowCompModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>Type de compétition</Text>
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <TouchableOpacity 
                  style={[styles.radioBtn, compType === 'Meeting' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setCompType('Meeting')}
                >
                  <Text style={{ color: compType === 'Meeting' ? '#fff' : theme.text, fontWeight: '600' }}>Meeting</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.radioBtn, compType === 'Championnat' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setCompType('Championnat')}
                >
                  <Text style={{ color: compType === 'Championnat' ? '#fff' : theme.text, fontWeight: '600' }}>Championnat</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Nom de la compétition</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, marginBottom: 16 }]}
                placeholder="Ex: Championnat de France"
                placeholderTextColor={theme.icon}
                value={compName}
                onChangeText={setCompName}
              />

              <Text style={[styles.label, { color: theme.text }]}>Adresse / Lieu</Text>
              <View style={{ zIndex: addressSuggestions.length > 0 ? 1000 : 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, marginBottom: addressSuggestions.length > 0 ? 0 : 16 }]}
                  placeholder="Ex: Stade de France, Paris"
                  placeholderTextColor={theme.icon}
                  value={compAddress}
                  onChangeText={searchAddress}
                />
                {isSearchingAddress && <ActivityIndicator size="small" color={theme.primary} style={{ position: 'absolute', right: 10, top: 15 }} />}
                
                {addressSuggestions.length > 0 && (
                  <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginBottom: 16, maxHeight: 200 }}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {addressSuggestions.map(sug => (
                        <TouchableOpacity 
                          key={sug.place_id} 
                          style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                          onPress={() => {
                            setCompAddress(sug.display_name);
                            setAddressSuggestions([]);
                          }}
                        >
                          <Text style={{ color: theme.text }} numberOfLines={2}>{sug.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Lien (Horaires, PDF...)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, marginBottom: 10 }]}
                placeholder="Ex: https://athle.fr/horaires..."
                placeholderTextColor={theme.icon}
                value={compLink}
                onChangeText={setCompLink}
                keyboardType="url"
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 8, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 6 }}
                onPress={handleUploadPDF}
              >
                <MaterialIcons name="picture-as-pdf" size={18} color={theme.primary} />
                <Text style={{ color: theme.text, marginLeft: 6 }}>Importer un PDF officiel depuis le téléphone</Text>
              </TouchableOpacity>

              <Text style={[styles.label, { color: theme.text }]}>Consignes / Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, marginBottom: 16, height: 100 }]}
                placeholder="Ex: Rendez-vous au bus à 13h30..."
                placeholderTextColor={theme.icon}
                value={compDescription}
                onChangeText={setCompDescription}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.label, { color: theme.text }]}>Participants</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <TouchableOpacity 
                  style={[styles.radioBtn, compAssignment === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setCompAssignment('all')}
                >
                  <Text style={{ color: compAssignment === 'all' ? '#fff' : theme.text, fontWeight: '600' }}>Tout le groupe</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.radioBtn, compAssignment === 'specific' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={() => setCompAssignment('specific')}
                >
                  <Text style={{ color: compAssignment === 'specific' ? '#fff' : theme.text, fontWeight: '600' }}>Sélection</Text>
                </TouchableOpacity>
              </View>

              {compAssignment === 'specific' && (
                <View style={{ backgroundColor: theme.card, borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  {groupAthletes.length === 0 ? (
                    <Text style={{ color: theme.icon, fontStyle: 'italic' }}>Aucun athlète dans ce groupe.</Text>
                  ) : (
                    groupAthletes.map(athlete => {
                      const isSelected = compSelectedAthletes.includes(athlete.id);
                      return (
                        <TouchableOpacity 
                          key={athlete.id} 
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }}
                          onPress={() => {
                            if (isSelected) {
                              setCompSelectedAthletes(prev => prev.filter(id => id !== athlete.id));
                            } else {
                              setCompSelectedAthletes(prev => [...prev, athlete.id]);
                            }
                          }}
                        >
                          <MaterialIcons name={isSelected ? "check-box" : "check-box-outline-blank"} size={24} color={isSelected ? theme.primary : theme.icon} />
                          <Text style={{ color: theme.text, marginLeft: 12, fontSize: 16 }}>{athlete.firstname} {athlete.lastname}</Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              <CustomButton 
                title={savingComp ? "Enregistrement..." : "Créer la compétition"} 
                onPress={saveCompetition}
                style={{ marginTop: 10, marginBottom: 40 }}
                disabled={savingComp}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modale Jour de repos */}
      <Modal visible={showRestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, minHeight: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Jour de repos</Text>
              <TouchableOpacity onPress={() => setShowRestModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.label, { color: theme.text }]}>Commentaire (optionnel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="Ex: Massage, balade légère..."
              placeholderTextColor={theme.icon}
              value={restComment}
              onChangeText={setRestComment}
              multiline
            />
            <CustomButton 
              title={savingRest ? "Enregistrement..." : "Valider le jour de repos"} 
              onPress={saveRestDay}
              style={{ marginTop: 20 }}
              disabled={savingRest}
            />
          </View>
        </View>
      </Modal>

      {/* Modale Ajouter une Séance (Passerelle Bibliothèque / Zéro) */}
      <Modal visible={showLibraryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background, minHeight: '60%', maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Ajouter une séance</Text>
              <TouchableOpacity onPress={() => setShowLibraryModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <TouchableOpacity 
                style={[styles.addWorkoutBtn, { backgroundColor: theme.primary, borderColor: theme.primary, marginBottom: 24, paddingVertical: 14 }]}
                onPress={handleCreateFromScratch}
              >
                <MaterialIcons name="add" size={20} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 }}>Créer une séance de zéro</Text>
              </TouchableOpacity>

              <Text style={{ color: theme.icon, fontSize: 14, marginBottom: 16, fontWeight: '600' }}>
                Ou piocher dans vos modèles :
              </Text>

              {templates.length === 0 ? (
                <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>Aucun modèle dans votre bibliothèque.</Text>
              ) : (
                templates.map(t => (
                  <TouchableOpacity 
                    key={t.id} 
                    style={[styles.workoutCard, { backgroundColor: theme.card, borderLeftColor: theme.primary, marginBottom: 12 }]} 
                    onPress={() => handleSelectTemplate(t)}
                  >
                    <Text style={[styles.workoutTitle, { color: theme.text }]}>{t.name}</Text>
                    <Text style={[styles.workoutSubtitle, { color: theme.icon }]}>{t.type}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Hamburger Menu Modale */}
      {showHamburgerMenu && (
        <Modal visible={true} transparent animationType="none" onRequestClose={closeHamburgerMenu}>
          <TouchableWithoutFeedback onPress={closeHamburgerMenu}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableWithoutFeedback>
                <Animated.View style={{
                  width: 250,
                  height: '100%',
                  backgroundColor: theme.card,
                  paddingTop: 60, // Espace pour la barre de statut et le header
                  paddingHorizontal: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: -5, height: 0 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 10,
                  transform: [{
                    translateX: hamburgerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [250, 0]
                    })
                  }]
                }}>
                  
                  <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 30 }}>Menu</Text>

                  <TouchableOpacity style={styles.hamburgerItem} onPress={() => { closeHamburgerMenu(); setTimeout(() => setShowPeriModal(true), 250); }}>
                    <Text style={[styles.hamburgerItemText, { color: theme.text, fontSize: 18 }]}>Périodisation</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.hamburgerItem} onPress={() => { closeHamburgerMenu(); setTimeout(() => router.push('/exercises'), 250); }}>
                    <Text style={[styles.hamburgerItemText, { color: theme.text, fontSize: 18 }]}>Bibliothèque d'exercices</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.hamburgerItem} onPress={() => { closeHamburgerMenu(); setTimeout(() => router.push('/sessions'), 250); }}>
                    <Text style={[styles.hamburgerItemText, { color: theme.text, fontSize: 18 }]}>Bibliothèque de séances</Text>
                  </TouchableOpacity>

                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pillScroll: { flexDirection: 'row', marginBottom: 15 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  
  weekNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  navBtn: { padding: 5 },
  monthText: { fontSize: 18, fontWeight: 'bold' },
  
  calendarContainer: { flex: 1, padding: 10 },
  
  periodizationContainer: { paddingHorizontal: 10, marginBottom: 20 },
  periBand: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, borderLeftWidth: 4 },
  periText: { fontWeight: 'bold', fontSize: 15 },
  
  daysList: { paddingHorizontal: 10, paddingBottom: 50 },
  dayRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 24, minHeight: 100 },
  dayHeader: { width: 70, alignItems: 'center', paddingTop: 0 },
  dayName: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  dayNumber: { fontSize: 28, fontWeight: '300' },
  
  dayContent: { flex: 1, paddingLeft: 16 },
  workoutCard: { padding: 16, borderRadius: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  workoutTitle: { fontWeight: '600', fontSize: 15 },
  workoutSubtitle: { fontSize: 13, marginTop: 6, opacity: 0.8 },
  
  addWorkoutBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginTop: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  
  actionSheetContent: { padding: 24, borderRadius: 24 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12 },
  actionButtonText: { fontSize: 16, fontWeight: 'bold', marginLeft: 16 },
  
  radioBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#333', marginRight: 8 },
  
  hamburgerItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  hamburgerItemText: { fontSize: 18, fontWeight: '500' }
});
