import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { supabase } from '../../lib/supabase';
import { router, useLocalSearchParams } from 'expo-router';
import { CustomButton } from '../../components/CustomButton';

const SESSION_TYPES = [
  'Aérobie', 'Lactique', 'Musculation', 'Récupération', 
  'Mobilité', 'Plyométrie', 'Technique', 'Escalier', 'Libre'
];

export default function CreateSessionScreen() {
  const theme = useTheme();
  const { editId, calendarDate, groupId, calendarEditId } = useLocalSearchParams();
  
  // Etape 1 ou 2
  const [step, setStep] = useState<1 | 2>(1);
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  
  // Flat list of items
  // An item has { id, itemType: 'effort' | 'note' | 'title', ...fields }
  const [items, setItems] = useState<any[]>([]);
  
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);

  const FIELD_CHIPS: Record<string, string[]> = {
    duration: ['sec', 'min', 'h', 'Max'],
    distance: ['m', 'km'],
    reps: ['Max', 'Échec'],
    rest: ['sec', 'min', 'Libre'],
    intensity: ['%', '% VMA', '% PMA', 'RPE', 'Allure'],
    charge: ['kg', '% Max', 'PDC'],
    time_per_ex: ['sec', 'min'],
  };
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  // Exercise Picker Modal
  const [showExPicker, setShowExPicker] = useState(false);
  const [exPickerTargetIndex, setExPickerTargetIndex] = useState<number | null>(null);
  const [exercisesList, setExercisesList] = useState<any[]>([]);

  const fetchExercises = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('exercises').select('id, name, category, is_official').or(`is_official.eq.true,coach_id.eq.${user?.id}`);
    if (data) setExercisesList(data);
  };

  const loadData = async () => {
    if (editId) {
      const { data, error } = await supabase.from('workout_templates').select('*').eq('id', editId).single();
      if (data) {
        setName(data.name);
        if (SESSION_TYPES.includes(data.type)) {
          setType(data.type);
        } else {
          setType('Libre');
          setCustomType(data.type);
        }
        
        // Backward compatibility with old "blocks" format
        if (data.content?.blocks) {
          const migratedItems: any[] = [];
          data.content.blocks.forEach((b: any) => {
            migratedItems.push({ id: Math.random().toString(), itemType: 'title', value: b.name });
            b.items.forEach((i: any) => {
              migratedItems.push({ ...i, itemType: 'effort', id: Math.random().toString() });
            });
          });
          setItems(migratedItems);
        } else {
          setItems(data.content?.items || []);
        }
        
        setStep(2); // Directement à l'étape 2 en édition
      }
    } else if (calendarEditId) {
      const { data, error } = await supabase.from('workouts').select('*').eq('id', calendarEditId).single();
      if (data) {
        setName(data.title);
        if (SESSION_TYPES.includes(data.type)) {
          setType(data.type);
        } else {
          setType('Libre');
          setCustomType(data.type);
        }
        setItems(data.content?.items || []);
        setStep(2);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExercises();
    if (editId || calendarEditId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, []);

  const addItem = (itemType: 'effort' | 'note' | 'title') => {
    // Par défaut, fermer les anciens items d'effort pour garder l'écran propre
    const newItems = items.map(i => ({ ...i, isCollapsed: i.itemType === 'effort' ? true : i.isCollapsed }));
    setItems([...newItems, { id: Math.random().toString(), itemType, isCollapsed: false }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= items.length) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setItems(newItems);
  };

  const updateItemField = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const openExercisePicker = (index: number) => {
    setExPickerTargetIndex(index);
    setShowExPicker(true);
  };

  const selectExercise = (ex: any) => {
    if (exPickerTargetIndex !== null) {
      const newItems = [...items];
      newItems[exPickerTargetIndex].exercise_id = ex.id;
      newItems[exPickerTargetIndex].exercise_name = ex.name;
      setItems(newItems);
    }
    setShowExPicker(false);
  };

  const getEffortSummary = (item: any) => {
    let parts = [];
    if (item.exercise_name) parts.push(`🏋️ ${item.exercise_name}`);
    
    // Musculation
    if (item.sets && item.reps) parts.push(`${item.sets} x ${item.reps}`);
    else if (item.sets) parts.push(`${item.sets} séries`);
    else if (item.reps) parts.push(`${item.reps} reps`);

    if (item.charge) parts.push(item.charge);
    
    // Aérobie / Lactique
    if (item.duration) parts.push(`⏱ ${item.duration}`);
    if (item.distance) parts.push(`📏 ${item.distance}`);
    if (item.intensity) parts.push(`⚡ ${item.intensity}`);
    
    if (parts.length === 0) return "Effort vide (Cliquez pour éditer)";
    return parts.join(' • ');
  };

  // --- Parsers ---
  const parseTimeString = (str: string) => {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    if (s === 'max' || s === 'libre') return { type: s };
    
    // match MM:SS ou M:SS
    const timeMatch = s.match(/^(\d+):(\d{1,2})$/);
    if (timeMatch) return { type: 'time', seconds: parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) };

    // match Xmin Ys, etc
    let seconds = 0;
    const hMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
    const minMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:min|m)(?!\w)/); // match min or m (but not max/meters alone if we had strict m)
    const secMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:sec|s)/);
    
    if (hMatch) seconds += parseFloat(hMatch[1]) * 3600;
    if (minMatch) seconds += parseFloat(minMatch[1]) * 60;
    if (secMatch) seconds += parseFloat(secMatch[1]);
    
    if (seconds > 0) return { type: 'time', seconds };
    
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'number', value: num };
    
    return { type: 'raw', text: str };
  };

  const parseWeightString = (str: string) => {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    if (s === 'pdc') return { type: 'bodyweight' };
    
    const unitMatch = s.match(/(\d+(?:\.\d+)?)\s*(kg|% max)/i);
    if (unitMatch) return { type: 'weight', value: parseFloat(unitMatch[1]), unit: unitMatch[2].toLowerCase() === 'kg' ? 'kg' : '% max' };
    
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'weight', value: num, unit: 'kg' };
    return { type: 'raw', text: str };
  };

  const parseRepsString = (str: string) => {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    if (s === 'max' || s === 'échec' || s === 'echec') return { type: 'max' };
    
    const rangeMatch = s.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) return { type: 'range', min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
    
    const num = parseInt(s);
    if (!isNaN(num)) return { type: 'exact', count: num };
    return { type: 'raw', text: str };
  };

  const parseDistanceString = (str: string) => {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    const unitMatch = s.match(/(\d+(?:\.\d+)?)\s*(km|m)/i);
    if (unitMatch) {
       let val = parseFloat(unitMatch[1]);
       if (unitMatch[2].toLowerCase() === 'km') val *= 1000;
       return { type: 'distance', meters: val };
    }
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'distance', meters: num }; 
    return { type: 'raw', text: str };
  };

  const parseIntensityString = (str: string) => {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    
    const rpeMatch = s.match(/(\d+(?:\.\d+)?)\s*rpe|rpe\s*(\d+(?:\.\d+)?)/i);
    if (rpeMatch) return { type: 'intensity', value: parseFloat(rpeMatch[1] || rpeMatch[2]), unit: 'rpe' };

    const unitMatch = s.match(/(\d+(?:\.\d+)?)\s*(% vma|% pma|%|allure)/i);
    if (unitMatch) return { type: 'intensity', value: parseFloat(unitMatch[1]), unit: unitMatch[2].toLowerCase() };
    
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'intensity', value: num, unit: '%' }; // par defaut % si juste un chiffre
    return { type: 'raw', text: str };
  };

  const handleSave = async () => {
    const finalType = (type === 'Libre' && customType.trim()) ? customType : type;
    
    if (!name.trim() || !finalType.trim()) {
      Alert.alert('Erreur', 'Le nom et le type de séance sont obligatoires.');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Enrichissement avec les données parsées (Smart Parser)
    const parsedItems = items.map(item => {
      const p = { ...item };
      if (p.duration) p.parsed_duration = parseTimeString(p.duration);
      if (p.rest) p.parsed_rest = parseTimeString(p.rest);
      if (p.time_per_ex) p.parsed_time_per_ex = parseTimeString(p.time_per_ex);
      if (p.charge) p.parsed_charge = parseWeightString(p.charge);
      if (p.reps) p.parsed_reps = parseRepsString(p.reps);
      if (p.sets) p.parsed_sets = parseRepsString(p.sets); // sets share similar numeric/range logic
      if (p.distance) p.parsed_distance = parseDistanceString(p.distance);
      if (p.intensity) p.parsed_intensity = parseIntensityString(p.intensity);
      return p;
    });

    if (calendarEditId) {
      // Mise à jour dans le calendrier (workouts)
      const payload = {
        title: name,
        type: finalType,
        content: { items: parsedItems }
      };
      const { error } = await supabase.from('workouts').update(payload).eq('id', calendarEditId);
      
      if (!error && saveToLibrary) {
        await supabase.from('workout_templates').insert({
          coach_id: user?.id,
          name,
          type: finalType,
          content: { items: parsedItems }
        });
      }

      if (error) Alert.alert('Erreur', error.message);
      else router.back();
    } else if (calendarDate && groupId) {
      // Sauvegarde dans le calendrier (workouts)
      const payload = {
        coach_id: user?.id,
        group_id: groupId,
        date: calendarDate,
        title: name,
        type: finalType,
        content: { items: parsedItems },
        duration_minutes: 0
      };
      const { error } = await supabase.from('workouts').insert(payload);
      
      if (!error && saveToLibrary) {
        await supabase.from('workout_templates').insert({
          coach_id: user?.id,
          name,
          type: finalType,
          content: { items: parsedItems }
        });
      }

      if (error) Alert.alert('Erreur', error.message);
      else router.back();
    } else {
      // Sauvegarde dans la bibliothèque (workout_templates)
      const payload = {
        coach_id: user?.id,
        name,
        type: finalType,
        content: { items: parsedItems }
      };

      if (editId) {
        const { error } = await supabase.from('workout_templates').update(payload).eq('id', editId);
        if (error) Alert.alert('Erreur', error.message);
        else router.back();
      } else {
        const { error } = await supabase.from('workout_templates').insert(payload);
        if (error) Alert.alert('Erreur', error.message);
        else router.back();
      }
    }
    setSaving(false);
  };

  const handleChipPress = (index: number, field: string, chip: string) => {
    const currentValue = (items[index][field] || '').trim();
    let newVal = currentValue;

    const STANDALONE_CHIPS = ['Max', 'Échec', 'PDC', 'Libre'];
    const UNIT_CHIPS = ['sec', 'min', 'h', 'm', 'km', '%', '% VMA', '% PMA', 'kg', '% Max', 'RPE', 'Allure'];

    if (STANDALONE_CHIPS.includes(chip)) {
      // Un chip "autonome" remplace tout (ex: PDC devient juste PDC, impossible de faire "50 PDC")
      newVal = chip;
    } else if (UNIT_CHIPS.includes(chip)) {
      // Une unité ne peut être ajoutée que s'il y a déjà une valeur (ex: impossible de faire "m120")
      if (!currentValue) return;
      newVal = `${currentValue} ${chip}`;
    } else if (chip === '-') {
      if (!currentValue) return;
      newVal = `${currentValue}-`;
    } else {
      newVal = currentValue ? `${currentValue} ${chip}` : chip;
    }
    
    updateItemField(index, field, newVal);
  };

  const renderField = (index: number, field: string, placeholder: string, width: any = '48%', isTextArea = false) => {
    const value = items[index][field] || '';
    const fieldId = `${index}-${field}`;
    const isFocused = focusedFieldId === fieldId;
    const chips = FIELD_CHIPS[field] || [];

    return (
      <View style={{ width, marginBottom: 12 }}>
        <Text style={[styles.fieldLabel, { color: theme.icon }]}>{placeholder}</Text>
        <TextInput
          style={[styles.fieldInput, { backgroundColor: theme.background, color: theme.text, borderColor: isFocused ? theme.primary : theme.border, minHeight: isTextArea ? 60 : 44 }]}
          value={value}
          onChangeText={(v) => {
            // Empecher de commencer par une unité si c'est censé être une mesure (optionnel, mais géré par le clavier numérique sur mobile)
            updateItemField(index, field, v);
          }}
          placeholder="..."
          placeholderTextColor={theme.border}
          multiline={isTextArea}
          keyboardType={isTextArea || field === 'name' || field === 'activity' || field === 'consignes' || field === 'params' || field === 'content' ? 'default' : 'numbers-and-punctuation'}
          onFocus={() => setFocusedFieldId(fieldId)}
        />
        {isFocused && chips.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" style={{ marginTop: 6, flexGrow: 0 }}>
            {chips.map(chip => (
              <TouchableOpacity 
                key={chip} 
                style={[styles.chipBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                onPress={() => handleChipPress(index, field, chip)}
              >
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold' }}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderEffortFields = (index: number, item: any) => {
    const currentType = type === 'Libre' ? 'Libre' : type;

    if (currentType === 'Aérobie') {
      return (
        <View style={styles.itemRowGrid}>
          {renderField(index, 'duration', 'Durée')}
          {renderField(index, 'distance', 'Distance')}
          {renderField(index, 'reps', 'Répétitions')}
          {renderField(index, 'rest', 'Repos')}
          {renderField(index, 'intensity', 'Intensité', '100%')}
          {renderField(index, 'notes', 'Commentaires', '100%', true)}
        </View>
      );
    }
    if (currentType === 'Lactique') {
      return (
        <View style={styles.itemRowGrid}>
          {renderField(index, 'distance', 'Distance')}
          {renderField(index, 'duration', 'Chrono')}
          {renderField(index, 'reps', 'Répétitions')}
          {renderField(index, 'rest', 'Récupération')}
          {renderField(index, 'intensity', 'Intensité', '100%')}
          {renderField(index, 'notes', 'Commentaires', '100%', true)}
        </View>
      );
    }
    if (['Musculation', 'Mobilité', 'Plyométrie', 'Technique'].includes(currentType)) {
      return (
        <View style={styles.itemRowGrid}>
          <View style={{ width: '100%', marginBottom: 12 }}>
            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Exercice</Text>
            <TouchableOpacity 
              style={[styles.exSelectBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={() => openExercisePicker(index)}
            >
              <Text style={{ color: item.exercise_name ? theme.text : theme.icon }}>
                {item.exercise_name || "Sélectionner un exercice..."}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={theme.icon} />
            </TouchableOpacity>
          </View>
          
          {currentType === 'Musculation' && (
            <>
              {renderField(index, 'sets', 'Séries', '31%')}
              {renderField(index, 'reps', 'Répétitions', '31%')}
              {renderField(index, 'charge', 'Charge', '31%')}
              {renderField(index, 'rest', 'Repos', '48%')}
              {renderField(index, 'notes', 'Commentaires', '48%')}
            </>
          )}
          {currentType === 'Mobilité' && (
            <>
              {renderField(index, 'duration', 'Durée', '48%')}
              {renderField(index, 'reps', 'Répétitions', '48%')}
              {renderField(index, 'notes', 'Commentaires', '100%', true)}
            </>
          )}
          {currentType === 'Plyométrie' && (
            <>
              {renderField(index, 'sets', 'Séries', '31%')}
              {renderField(index, 'reps', 'Répétitions', '31%')}
              {renderField(index, 'rest', 'Repos', '31%')}
              {renderField(index, 'notes', 'Commentaires', '100%', true)}
            </>
          )}
          {currentType === 'Technique' && (
            <>
              {renderField(index, 'reps', 'Répétitions', '48%')}
              {renderField(index, 'duration', 'Durée', '48%')}
              {renderField(index, 'consignes', 'Consignes spécifiques', '100%', true)}
            </>
          )}
        </View>
      );
    }
    if (currentType === 'Récupération') {
      return (
        <View style={styles.itemRowGrid}>
          {renderField(index, 'duration', 'Durée Totale', '48%')}
          {renderField(index, 'time_per_ex', 'Temps/Activité', '48%')}
          {renderField(index, 'activity', 'Exercices / Activités', '100%', true)}
          {renderField(index, 'notes', 'Commentaires', '100%', true)}
        </View>
      );
    }
    if (currentType === 'Escalier') {
      return (
        <View style={styles.itemRowGrid}>
          {renderField(index, 'montees', 'Montées')}
          {renderField(index, 'passages', 'Passages')}
          {renderField(index, 'duration', 'Durée')}
          {renderField(index, 'rest', 'Repos')}
          {renderField(index, 'params', 'Paramètres Infrastructures', '100%')}
          {renderField(index, 'notes', 'Commentaires', '100%', true)}
        </View>
      );
    }
    // Libre
    return (
      <View style={styles.itemRowGrid}>
        {renderField(index, 'content', 'Contenu libre (Détails, exercices, temps...)', '100%', true)}
      </View>
    );
  };

  if (loading) return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}><ActivityIndicator size="large" style={{ marginTop: 40 }} color={theme.primary} /></SafeAreaView>;

  // ÉTAPE 1 : Choix du type de séance
  if (step === 1) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Type de séance</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <Text style={{ fontSize: 16, color: theme.icon, marginBottom: 20 }}>Que souhaitez-vous créer aujourd'hui ?</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {SESSION_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => { setType(t); setStep(2); }}
              >
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ÉTAPE 2 : Constructeur de séance (Flat List)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (!editId) setStep(1);
          else router.back();
        }} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{editId ? 'Modifier' : 'Constructeur'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={{ marginBottom: 24 }}>
            <Text style={[styles.fieldLabel, { color: theme.icon }]}>Nom de la séance *</Text>
            <TextInput
              style={[styles.fieldInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, fontSize: 18, fontWeight: 'bold', paddingVertical: 14 }]}
              placeholder="Ex: VMA Courte..."
              placeholderTextColor={theme.icon}
              value={name}
              onChangeText={setName}
            />
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <View style={[styles.typeBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{type}</Text>
              </View>
              {type === 'Libre' && (
                <TextInput
                  style={[styles.fieldInput, { flex: 1, marginLeft: 12, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  placeholder="Renommer le type (Optionnel, ex: Yoga)"
                  placeholderTextColor={theme.icon}
                  value={customType}
                  onChangeText={setCustomType}
                />
              )}
            </View>
          </View>

          {/* Liste Plate avec Timeline Visuelle */}
          <View style={{ marginTop: 10 }}>
            {items.map((item, index) => {
              
              let dotColor = theme.primary;
              if (item.itemType === 'note') dotColor = '#D97706';
              if (item.itemType === 'title') dotColor = theme.text;

              let cardContent = null;

              if (item.itemType === 'title') {
                cardContent = (
                  <View style={[styles.titleRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TextInput
                      style={{ flex: 1, fontSize: 16, fontWeight: 'bold', color: theme.text }}
                      placeholder="Ex: Échauffement"
                      placeholderTextColor={theme.icon}
                      value={item.value || ''}
                      onChangeText={(v) => updateItemField(index, 'value', v)}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => moveItem(index, -1)} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-up" size={20} color={theme.icon} /></TouchableOpacity>
                      <TouchableOpacity onPress={() => moveItem(index, 1)} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-down" size={20} color={theme.icon} /></TouchableOpacity>
                      <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 4, marginLeft: 4 }}><MaterialIcons name="close" size={20} color="#EF4444" /></TouchableOpacity>
                    </View>
                  </View>
                );
              } else if (item.itemType === 'note') {
                cardContent = (
                  <View style={[styles.noteRow, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <MaterialIcons name="lightbulb-outline" size={20} color="#D97706" style={{ marginTop: 2, marginRight: 8 }} />
                      <TextInput
                        style={{ flex: 1, fontSize: 14, color: '#92400E', minHeight: 40 }}
                        placeholder="Ajouter une note..."
                        placeholderTextColor="#D97706"
                        value={item.value || ''}
                        onChangeText={(v) => updateItemField(index, 'value', v)}
                        multiline
                      />
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => moveItem(index, -1)} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-up" size={20} color="#D97706" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => moveItem(index, 1)} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-down" size={20} color="#D97706" /></TouchableOpacity>
                        <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 4, marginLeft: 4 }}><MaterialIcons name="close" size={20} color="#EF4444" /></TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              } else {
                // Effort / Exercise
                let isExerciseBased = ['Musculation', 'Mobilité', 'Plyométrie', 'Technique'].includes(type);
                let summary = getEffortSummary(item);
                
                cardContent = (
                  <View style={[styles.effortRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <TouchableOpacity 
                      style={[styles.effortHeader, { marginBottom: item.isCollapsed ? 0 : 16 }]}
                      onPress={() => updateItemField(index, 'isCollapsed', !item.isCollapsed)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                        <MaterialIcons name={item.isCollapsed ? "keyboard-arrow-right" : "keyboard-arrow-down"} size={22} color={theme.icon} style={{ marginRight: 6 }} />
                        {item.isCollapsed ? (
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, flex: 1 }} numberOfLines={1}>
                            {summary}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text, flex: 1 }}>
                            {isExerciseBased ? 'Exercice' : 'Effort'}
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => moveItem(index, -1)} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-up" size={20} color={theme.icon} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => moveItem(index, 1)} style={{ padding: 4 }}><MaterialIcons name="keyboard-arrow-down" size={20} color={theme.icon} /></TouchableOpacity>
                        <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 4, marginLeft: 8 }}><MaterialIcons name="close" size={20} color="#EF4444" /></TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                    {!item.isCollapsed && renderEffortFields(index, item)}
                  </View>
                );
              }

              return (
                <View key={item.id} style={{ flexDirection: 'row' }}>
                  {/* Colonne Timeline */}
                  <View style={{ width: 36, alignItems: 'center' }}>
                    <View style={{ width: 2, height: 28, backgroundColor: index === 0 ? 'transparent' : theme.border }} />
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: dotColor, zIndex: 2 }} />
                    <View style={{ width: 2, flex: 1, backgroundColor: index === items.length - 1 ? 'transparent' : theme.border }} />
                  </View>
                  
                  {/* Colonne Contenu */}
                  <View style={{ flex: 1, paddingBottom: 16 }}>
                    {cardContent}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Add Toolbar */}
          <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <TouchableOpacity 
              style={[styles.addToolbarBtn, { backgroundColor: theme.primary, borderColor: theme.primary, flex: 1, minWidth: '48%' }]}
              onPress={() => addItem('effort')}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 6 }}>
                {['Musculation', 'Mobilité', 'Plyométrie', 'Technique'].includes(type) ? 'Ajouter un exercice' : 'Ajouter un effort'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.addToolbarBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A', flex: 1, minWidth: '48%' }]}
              onPress={() => addItem('note')}
            >
              <MaterialIcons name="edit-note" size={20} color="#D97706" />
              <Text style={{ color: '#D97706', fontWeight: 'bold', marginLeft: 6 }}>Ajouter une note</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.addToolbarBtn, { backgroundColor: theme.background, borderColor: theme.border, width: '100%' }]}
              onPress={() => addItem('title')}
            >
              <MaterialIcons name="title" size={20} color={theme.text} />
              <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 6 }}>Ajouter un séparateur (titre)</Text>
            </TouchableOpacity>
          </View>

          {(calendarDate || calendarEditId) && (
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: -10, backgroundColor: theme.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}
              onPress={() => setSaveToLibrary(!saveToLibrary)}
            >
              <MaterialIcons name={saveToLibrary ? "check-box" : "check-box-outline-blank"} size={24} color={saveToLibrary ? theme.primary : theme.icon} />
              <Text style={{ marginLeft: 12, color: theme.text, fontSize: 15, fontWeight: '500', flex: 1 }}>
                Enregistrer également ce modèle dans ma bibliothèque
              </Text>
            </TouchableOpacity>
          )}

          <CustomButton 
            title={saving ? "Enregistrement..." : "Sauvegarder la séance"} 
            onPress={handleSave}
            style={{ marginVertical: 30 }}
            disabled={saving}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker Modal */}
      <Modal visible={showExPicker} transparent animationType="slide" onRequestClose={() => setShowExPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Choisir un exercice</Text>
              <TouchableOpacity onPress={() => setShowExPicker(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {exercisesList.map((ex) => (
                <TouchableOpacity 
                  key={ex.id} 
                  style={[styles.exRow, { borderBottomColor: theme.border }]}
                  onPress={() => selectExercise(ex)}
                >
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>{ex.name}</Text>
                  {ex.is_official && (
                    <Text style={{ color: theme.primary, fontSize: 12, marginTop: 2 }}>Officiel • {ex.category}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 8, marginLeft: -8 },
  
  content: { padding: 20 },
  
  typeCard: { width: '48%', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16, alignItems: 'center', justifyContent: 'center' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  
  effortRow: { padding: 16, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  effortHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  noteRow: { padding: 16, borderRadius: 12, borderWidth: 1 },
  
  itemRowGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  fieldInput: { paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1, fontSize: 15 },
  
  chipBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, marginRight: 6 },
  
  exSelectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  
  addToolbarBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  exRow: { paddingVertical: 16, borderBottomWidth: 1 },
});
