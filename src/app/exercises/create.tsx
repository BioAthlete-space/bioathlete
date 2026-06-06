import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import { CustomButton } from '../../components/CustomButton';

const CATEGORIES = [
  'Musculation', 'Haltérophilie', 'Pliométrie', 'Escalier', 'Abdo'
];

const MUSCLES = [
  'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Adducteurs',
  'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Corps entier'
];

export default function CreateExerciseScreen() {
  const theme = useTheme();
  
  // Mandatory fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Musculation');
  const [primaryMuscle, setPrimaryMuscle] = useState('');
  const [description, setDescription] = useState('');
  
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Gérer l'absence de muscle pour les catégories spécifiques
    let finalMuscle = primaryMuscle;
    if (category === 'Abdo') finalMuscle = 'Abdominaux';
    if (category === 'Escalier') finalMuscle = 'Cardio/Jambes';

    if (!name || !category || !finalMuscle || !description) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('exercises')
      .insert({
        coach_id: user?.id,
        is_official: false,
        name,
        category,
        primary_muscle: finalMuscle,
        description,
        instructions: description // Fusion des deux champs comme demandé
      });

    setSaving(false);

    if (error) {
      Alert.alert('Erreur de sauvegarde', error.message);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Nouvel Exercice</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          
          <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Informations Essentielles</Text>
            
            <Text style={[styles.label, { color: theme.text }]}>Nom de l'exercice *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Squat Bulgare"
              placeholderTextColor={theme.icon}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>Catégorie *</Text>
            <View style={styles.chipContainer}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, { 
                    backgroundColor: category === cat ? theme.primary : theme.background,
                    borderColor: category === cat ? theme.primary : theme.border 
                  }]}
                  onPress={() => {
                    setCategory(cat);
                    if (cat === 'Abdo' || cat === 'Escalier') setPrimaryMuscle('');
                  }}
                >
                  <Text style={{ color: category === cat ? '#fff' : theme.text, fontWeight: '500' }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {category !== 'Abdo' && category !== 'Escalier' && (
              <>
                <Text style={[styles.label, { color: theme.text, marginTop: 24 }]}>Groupe musculaire principal *</Text>
                <View style={styles.chipContainer}>
                  {MUSCLES.map(muscle => (
                    <TouchableOpacity
                      key={muscle}
                      style={[styles.chip, { 
                        backgroundColor: primaryMuscle === muscle ? theme.primary : theme.background,
                        borderColor: primaryMuscle === muscle ? theme.primary : theme.border 
                      }]}
                      onPress={() => setPrimaryMuscle(muscle)}
                    >
                      <Text style={{ color: primaryMuscle === muscle ? '#fff' : theme.text, fontWeight: '500' }}>{muscle}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={[styles.label, { color: theme.text, marginTop: 24 }]}>Description *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, minHeight: 120, textAlignVertical: 'top' }]}
              placeholder="Décrivez l'exercice et ses consignes..."
              placeholderTextColor={theme.icon}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <CustomButton 
            title={saving ? "Enregistrement..." : "Ajouter l'exercice"} 
            onPress={handleSave}
            style={{ marginVertical: 30 }}
            disabled={saving}
          />

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 8, marginLeft: -8 },
  
  content: { padding: 20 },
  
  section: { padding: 16, borderRadius: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 15 },
  
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 }
});
