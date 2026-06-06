import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useThemeColor';
import { Header } from '../../../components/Header';
import { CustomButton } from '../../../components/CustomButton';
import { supabase } from '../../../lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

const WORKOUT_TYPES = ['Lactique', 'Musculation', 'Aérobie', 'Escalier', 'Cote', 'Compétition', 'Repos'];

export default function PlanningCreateScreen() {
  const { date: initDateStr, groupId: initGroupId, defaultType } = useLocalSearchParams();
  const theme = useTheme();

  // Form State
  const [date, setDate] = useState(initDateStr ? new Date(initDateStr as string) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState((defaultType as string) || 'Musculation');
  const [duration, setDuration] = useState(60); // minutes
  
  // Assignment
  const [groups, setGroups] = useState<any[]>([]);
  const [subgroups, setSubgroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initGroupId ? (initGroupId as string) : null);
  const [selectedSubgroupId, setSelectedSubgroupId] = useState<string | null>(null);
  
  // Exercises
  const [exercises, setExercises] = useState<any[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<any[]>([]);
  const [focusedExerciseId, setFocusedExerciseId] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCoachData();
  }, []);

  const fetchCoachData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch groups
    const { data: groupsData } = await supabase
      .from('coach_groups')
      .select('*')
      .eq('coach_id', user.id);

    if (groupsData) {
      setGroups(groupsData);
      const gid = initGroupId ? (initGroupId as string) : (groupsData.length > 0 ? groupsData[0].id : null);
      if (gid) {
        setSelectedGroupId(gid);
        fetchSubgroups(gid);
      }
    }
    
    // Fetch library exercises
    const { data: libData } = await supabase
      .from('coach_exercises')
      .select('*')
      .eq('coach_id', user.id);
      
    if (libData) {
      setLibraryExercises(libData);
    }
    
    setLoading(false);
  };

  const fetchSubgroups = async (groupId: string) => {
    const { data } = await supabase
      .from('coach_subgroups')
      .select('*')
      .eq('group_id', groupId);
    if (data) {
      setSubgroups(data);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedSubgroupId(null);
    fetchSubgroups(groupId);
  };

  const addExercise = () => {
    setExercises([...exercises, { id: Date.now().toString(), name: '', sets: '', reps: '', weight: '', distance: '', rest: '', weightUnit: 'kg', distanceUnit: 'm' }]);
  };

  const addToLibrary = async (name: string, category: string) => {
    if (!name) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Check if it already exists
    if (libraryExercises.find(ex => ex.name.toLowerCase() === name.toLowerCase())) return;

    const { data, error } = await supabase
      .from('coach_exercises')
      .insert({ coach_id: user.id, name, category })
      .select()
      .single();
      
    if (data) {
      setLibraryExercises(prev => [...prev, data]);
      Alert.alert('Succès', 'Exercice ajouté à votre bibliothèque.');
    }
  };

  const updateExercise = (id: string, field: string, value: string) => {
    setExercises(exercises.map(ex => ex.id === id ? { ...ex, [field]: value } : ex));
  };

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleSave = async () => {
    if (!title || !selectedGroupId) {
      Alert.alert('Erreur', 'Veuillez au moins renseigner un titre et choisir un groupe.');
      return;
    }
    setSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Format times
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = startTime.toTimeString().split(' ')[0]; // HH:MM:SS

    // Create Workout
    const { data: workoutData, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        coach_id: user?.id,
        group_id: selectedGroupId,
        subgroup_id: selectedSubgroupId, // nullable
        date: dateStr,
        start_time: timeStr,
        duration_minutes: duration,
        type: selectedType,
        title: title,
        description: description,
        status: 'planned'
      })
      .select()
      .single();

    if (workoutError) {
      Alert.alert('Erreur', workoutError.message);
      setSaving(false);
      return;
    }

    // Create Exercises
    if (exercises.length > 0) {
      const inserts = exercises.map((ex, idx) => ({
        workout_id: workoutData.id,
        name: ex.name,
        sets: parseInt(ex.sets) || 1,
        reps: ex.reps,
        weight: ex.weight ? `${ex.weight} ${ex.weightUnit || 'kg'}` : null,
        distance: ex.distance ? `${ex.distance} ${ex.distanceUnit || 'm'}` : null,
        rest: ex.rest,
        order_index: idx
      }));
      await supabase.from('workout_exercises').insert(inserts);
    }

    setSaving(false);
    Alert.alert('Succès', 'Séance planifiée avec succès !', [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Nouvelle Séance</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* ASSIGNATION */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Assignation</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.text }]}>Groupe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {groups.map(g => (
              <TouchableOpacity 
                key={g.id} 
                style={[styles.pill, { backgroundColor: selectedGroupId === g.id ? theme.primary : theme.border }]}
                onPress={() => handleGroupChange(g.id)}
              >
                <Text style={{ color: selectedGroupId === g.id ? 'white' : theme.text, fontWeight: '600' }}>{g.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {subgroups.length > 0 && (
            <>
              <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Sous-groupe (Optionnel)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                <TouchableOpacity 
                  style={[styles.pill, { backgroundColor: selectedSubgroupId === null ? theme.primary : theme.border }]}
                  onPress={() => setSelectedSubgroupId(null)}
                >
                  <Text style={{ color: selectedSubgroupId === null ? 'white' : theme.text, fontWeight: '600' }}>Groupe Complet</Text>
                </TouchableOpacity>
                {subgroups.map(sg => (
                  <TouchableOpacity 
                    key={sg.id} 
                    style={[styles.pill, { backgroundColor: selectedSubgroupId === sg.id ? theme.primary : theme.border }]}
                    onPress={() => setSelectedSubgroupId(sg.id)}
                  >
                    <Text style={{ color: selectedSubgroupId === sg.id ? 'white' : theme.text, fontWeight: '600' }}>{sg.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* PARAMETRES GENERAUX */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Paramètres</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          
          <Text style={[styles.label, { color: theme.text }]}>Titre de la séance</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            placeholder="Ex: VMA Courte sur piste"
            placeholderTextColor={theme.icon}
            value={title}
            onChangeText={setTitle}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.label, { color: theme.text }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
                {WORKOUT_TYPES.map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.pill, { backgroundColor: selectedType === t ? theme.primary : theme.border }]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={{ color: selectedType === t ? 'white' : theme.text, fontWeight: '600' }}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 16 }]}>
             <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                <TouchableOpacity style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ color: theme.text }}>{date.toLocaleDateString('fr-FR')}</Text>
                </TouchableOpacity>
             </View>
             <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.text }]}>Heure</Text>
                <TouchableOpacity style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => setShowTimePicker(true)}>
                  <Text style={{ color: theme.text }}>{startTime.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</Text>
                </TouchableOpacity>
             </View>
          </View>

          {showDatePicker && (
             <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
             />
          )}

          {showTimePicker && (
             <DateTimePicker
                value={startTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) setStartTime(selectedTime);
                }}
             />
          )}

          <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Durée estimée: {duration} min</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setDuration(Math.max(15, duration - 15))} style={[styles.durationBtn, { backgroundColor: theme.border }]}>
               <Text style={{ color: theme.text, fontSize: 20 }}>-</Text>
            </TouchableOpacity>
            <View style={{ flex: 1, height: 4, backgroundColor: theme.primary, marginHorizontal: 15, borderRadius: 2 }} />
            <TouchableOpacity onPress={() => setDuration(duration + 15)} style={[styles.durationBtn, { backgroundColor: theme.border }]}>
               <Text style={{ color: theme.text, fontSize: 20 }}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Consignes / Description</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, height: 80, textAlignVertical: 'top' }]}
            placeholder="Échauffement 15min. Gammes..."
            placeholderTextColor={theme.icon}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* EXERCICES */}
        {selectedType !== 'Repos' && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0 }]}>3. Corps de séance</Text>
              <TouchableOpacity onPress={addExercise} style={{ padding: 8 }}>
                 <Text style={{ color: theme.primary, fontWeight: 'bold' }}>+ Ajouter un bloc</Text>
              </TouchableOpacity>
            </View>
            
            {exercises.map((ex, index) => (
              <View key={ex.id} style={[styles.exerciseCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[styles.label, { color: theme.primary }]}>Bloc {index + 1}</Text>
                  <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                    <MaterialIcons name="delete" size={20} color={theme.icon} />
                  </TouchableOpacity>
                </View>

                <View style={{ zIndex: focusedExerciseId === ex.id ? 1000 : 1 }}>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, marginBottom: focusedExerciseId === ex.id ? 0 : 12 }]}
                    placeholder="Nom de l'exercice (ex: Squat, 5x200m)"
                    placeholderTextColor={theme.icon}
                    value={ex.name}
                    onFocus={() => setFocusedExerciseId(ex.id)}
                    onBlur={() => setTimeout(() => setFocusedExerciseId(null), 200)}
                    onChangeText={(v) => updateExercise(ex.id, 'name', v)}
                  />
                  {focusedExerciseId === ex.id && (
                    <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, marginBottom: 12, maxHeight: 150 }}>
                      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {libraryExercises.filter(l => l.name.toLowerCase().includes(ex.name.toLowerCase())).map(lib => (
                          <TouchableOpacity 
                            key={lib.id} 
                            style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border }}
                            onPress={() => {
                              updateExercise(ex.id, 'name', lib.name);
                              setFocusedExerciseId(null);
                            }}
                          >
                            <Text style={{ color: theme.text }}>{lib.name}</Text>
                          </TouchableOpacity>
                        ))}
                        {ex.name.length > 2 && !libraryExercises.find(l => l.name.toLowerCase() === ex.name.toLowerCase()) && (
                          <TouchableOpacity 
                            style={{ padding: 12, backgroundColor: theme.primary + '15', flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => {
                               addToLibrary(ex.name, selectedType);
                               setFocusedExerciseId(null);
                            }}
                          >
                            <MaterialIcons name="add-circle" size={20} color={theme.primary} />
                            <Text style={{ color: theme.primary, marginLeft: 8, fontWeight: 'bold' }}>Ajouter "{ex.name}" à ma bibliothèque</Text>
                          </TouchableOpacity>
                        )}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={styles.row}>
                   <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.label, { color: theme.text, fontSize: 12 }]}>Séries</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        placeholder="Ex: 4"
                        placeholderTextColor={theme.icon}
                        keyboardType="numeric"
                        value={ex.sets}
                        onChangeText={(v) => updateExercise(ex.id, 'sets', v)}
                      />
                   </View>
                   <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.label, { color: theme.text, fontSize: 12 }]}>Reps/Temps</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        placeholder="Ex: 10, 30s"
                        placeholderTextColor={theme.icon}
                        value={ex.reps}
                        onChangeText={(v) => updateExercise(ex.id, 'reps', v)}
                      />
                   </View>
                   <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.text, fontSize: 12 }]}>Repos</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
                        placeholder="Ex: 2min"
                        placeholderTextColor={theme.icon}
                        value={ex.rest}
                        onChangeText={(v) => updateExercise(ex.id, 'rest', v)}
                      />
                   </View>
                </View>

                <View style={[styles.row, { marginTop: 12 }]}>
                   <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.label, { color: theme.text, fontSize: 12 }]}>Charge (Optionnel)</Text>
                      <View style={{ flexDirection: 'row' }}>
                        <TextInput
                          style={[styles.input, { flex: 1, backgroundColor: theme.background, color: theme.text, borderColor: theme.border, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                          placeholder="80"
                          placeholderTextColor={theme.icon}
                          keyboardType="numeric"
                          value={ex.weight}
                          onChangeText={(v) => updateExercise(ex.id, 'weight', v)}
                        />
                        <TouchableOpacity 
                          style={{ backgroundColor: theme.border, paddingHorizontal: 10, justifyContent: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}
                          onPress={() => updateExercise(ex.id, 'weightUnit', ex.weightUnit === 'kg' ? '%' : 'kg')}
                        >
                          <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>{ex.weightUnit || 'kg'}</Text>
                        </TouchableOpacity>
                      </View>
                   </View>
                   <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: theme.text, fontSize: 12 }]}>Distance (Optionnel)</Text>
                      <View style={{ flexDirection: 'row' }}>
                        <TextInput
                          style={[styles.input, { flex: 1, backgroundColor: theme.background, color: theme.text, borderColor: theme.border, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                          placeholder="400"
                          placeholderTextColor={theme.icon}
                          keyboardType="numeric"
                          value={ex.distance}
                          onChangeText={(v) => updateExercise(ex.id, 'distance', v)}
                        />
                        <TouchableOpacity 
                          style={{ backgroundColor: theme.border, paddingHorizontal: 10, justifyContent: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}
                          onPress={() => updateExercise(ex.id, 'distanceUnit', ex.distanceUnit === 'm' ? 'km' : 'm')}
                        >
                          <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>{ex.distanceUnit || 'm'}</Text>
                        </TouchableOpacity>
                      </View>
                   </View>
                </View>
              </View>
            ))}
          </>
        )}

        <CustomButton 
          title={saving ? "Enregistrement..." : "Planifier la séance"} 
          onPress={handleSave}
          style={{ marginTop: 30, marginBottom: 50 }}
          disabled={saving}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 20 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 16 },
  row: { flexDirection: 'row' },
  
  pillScroll: { flexDirection: 'row', marginBottom: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
  
  durationBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  exerciseCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 }
});
