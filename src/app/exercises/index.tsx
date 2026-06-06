import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function ExerciseLibraryScreen() {
  const theme = useTheme();
  
  const [activeTab, setActiveTab] = useState<'official' | 'personal'>('official');
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<{ category: string | null, muscle: string | null }>({ category: null, muscle: null });
  const [tempFilters, setTempFilters] = useState<{ category: string | null, muscle: string | null }>({ category: null, muscle: null });
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const categories = [
    'Musculation', 'Haltérophilie', 'Pliométrie', 'Escalier', 'Abdo'
  ];

  // Edit Quick Modal
  const [editingExercise, setEditingExercise] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleExercisePress = (ex: any) => {
    setEditingExercise(ex);
    setEditName(ex.name);
    setEditCategory(ex.category || 'Musculation');
    setEditMuscle(ex.primary_muscle || '');
    setEditDesc(ex.description);
  };

  const saveQuickEdit = async () => {
    if (!editName.trim() || !editDesc.trim()) {
      Alert.alert('Erreur', 'Le nom et la description sont obligatoires.');
      return;
    }
    setIsSavingEdit(true);
    
    const updates: any = { description: editDesc };
    if (!editingExercise.is_official) {
      updates.name = editName;
      updates.category = editCategory;
      
      let finalMuscle = editMuscle;
      if (editCategory === 'Abdo') finalMuscle = 'Abdominaux';
      if (editCategory === 'Escalier') finalMuscle = 'Cardio/Jambes';
      updates.primary_muscle = finalMuscle;
    }

    const { error } = await supabase
      .from('exercises')
      .update(updates)
      .eq('id', editingExercise.id);
      
    setIsSavingEdit(false);
    
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setEditingExercise(null);
      fetchExercises();
    }
  };

  const muscles = [
    'Quadriceps', 'Ischio-jambiers', 'Fessiers', 'Mollets', 'Adducteurs',
    'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Corps entier'
  ];

  useFocusEffect(
    useCallback(() => {
      fetchExercises();
    }, [])
  );

  const fetchExercises = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch all exercises: official ones AND user's own ones
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`is_official.eq.true,coach_id.eq.${user?.id}`);
      
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setExercises(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Suppression irréversible',
      'Êtes-vous sûr de vouloir supprimer cet exercice de votre bibliothèque personnelle ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('exercises').delete().eq('id', id);
            if (error) Alert.alert('Erreur', error.message);
            else fetchExercises();
          }
        }
      ]
    );
  };

  // Memoized filtering for extreme performance
  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      // 1. Tab filtering
      const isOfficialTab = activeTab === 'official';
      if (ex.is_official !== isOfficialTab) return false;
      
      // 2. Detailed Filters
      if (filters.category && ex.category !== filters.category) return false;
      if (filters.muscle && ex.primary_muscle !== filters.muscle) return false;
      
      // 3. Search filtering
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ex.name.toLowerCase().includes(query) ||
          ex.primary_muscle.toLowerCase().includes(query) ||
          ex.category.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [exercises, activeTab, searchQuery, filters]);

  const renderExercise = ({ item }: { item: any }) => (
    <TouchableOpacity 
      onPress={() => handleExercisePress(item)}
      activeOpacity={0.7}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
          <Text style={[styles.cardCategory, { color: theme.primary }]}>{item.category} • {item.primary_muscle}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="edit" size={20} color={theme.icon} style={{ padding: 4, opacity: 0.6 }} />
          {!item.is_official && (
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 8, marginRight: -8, marginLeft: 4 }}>
              <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={[styles.cardDesc, { color: theme.icon }]} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Bibliothèque</Text>
        <TouchableOpacity onPress={() => router.push('/exercises/create')} style={styles.addBtn}>
          <MaterialIcons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'official' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('official')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'official' ? '#fff' : theme.text }]}>Officiels</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'personal' && { backgroundColor: theme.primary }]}
          onPress={() => setActiveTab('personal')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'personal' ? '#fff' : theme.text }]}>Mes Exercices</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={styles.searchContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[styles.searchBar, { flex: 1, backgroundColor: theme.card, borderColor: theme.border }]}>
            <MaterialIcons name="search" size={20} color={theme.icon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Rechercher..."
              placeholderTextColor={theme.icon}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color={theme.icon} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.filterBtn, { backgroundColor: (filters.category || filters.muscle) ? theme.primary : theme.card, borderColor: (filters.category || filters.muscle) ? theme.primary : theme.border }]}
            onPress={() => { setTempFilters(filters); setShowFilterModal(true); }}
          >
            <MaterialIcons name="tune" size={24} color={(filters.category || filters.muscle) ? '#fff' : theme.text} />
            {(filters.category || filters.muscle) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>

        {/* Affichage des filtres actifs en dessous */}
        {(filters.category || filters.muscle) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 8, paddingBottom: 8 }}>
            <TouchableOpacity 
              style={[styles.activeFilterPill, { backgroundColor: '#EF4444' + '20', borderColor: '#EF4444' }]}
              onPress={() => setFilters({ category: null, muscle: null })}
            >
              <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 12 }}>✕ Tout effacer</Text>
            </TouchableOpacity>
            
            {filters.category && (
              <View style={[styles.activeFilterPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 12 }}>Catégorie: <Text style={{ fontWeight: 'bold' }}>{filters.category}</Text></Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, category: null })} style={{ marginLeft: 6 }}>
                  <MaterialIcons name="close" size={14} color={theme.icon} />
                </TouchableOpacity>
              </View>
            )}
            
            {filters.muscle && (
              <View style={[styles.activeFilterPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 12 }}>Muscle: <Text style={{ fontWeight: 'bold' }}>{filters.muscle}</Text></Text>
                <TouchableOpacity onPress={() => setFilters({ ...filters, muscle: null })} style={{ marginLeft: 6 }}>
                  <MaterialIcons name="close" size={14} color={theme.icon} />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Results Header */}
      <Text style={[styles.resultCount, { color: theme.icon }]}>
        {filteredExercises.length} exercice(s) trouvé(s)
      </Text>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.id}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={20}
          windowSize={11}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={48} color={theme.icon} />
              <Text style={[styles.emptyStateText, { color: theme.text }]}>Aucun exercice trouvé.</Text>
            </View>
          }
        />
      )}

      {/* Modale de Filtres */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filtrer les exercices</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={[styles.filterSectionTitle, { color: theme.text }]}>Catégorie</Text>
              <View style={styles.chipContainer}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, { 
                      backgroundColor: tempFilters.category === cat ? theme.primary : theme.card,
                      borderColor: tempFilters.category === cat ? theme.primary : theme.border 
                    }]}
                    onPress={() => setTempFilters({ ...tempFilters, category: tempFilters.category === cat ? null : cat })}
                  >
                    <Text style={{ color: tempFilters.category === cat ? '#fff' : theme.text, fontWeight: '500', fontSize: 13 }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tempFilters.category !== 'Abdo' && tempFilters.category !== 'Escalier' && (
                <>
                  <Text style={[styles.filterSectionTitle, { color: theme.text, marginTop: 24 }]}>Groupe musculaire</Text>
                  <View style={styles.chipContainer}>
                    {muscles.map(muscle => (
                      <TouchableOpacity
                        key={muscle}
                        style={[styles.chip, { 
                          backgroundColor: tempFilters.muscle === muscle ? theme.primary : theme.card,
                          borderColor: tempFilters.muscle === muscle ? theme.primary : theme.border 
                        }]}
                        onPress={() => setTempFilters({ ...tempFilters, muscle: tempFilters.muscle === muscle ? null : muscle })}
                      >
                        <Text style={{ color: tempFilters.muscle === muscle ? '#fff' : theme.text, fontWeight: '500', fontSize: 13 }}>{muscle}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
              <TouchableOpacity 
                style={[styles.modalFooterBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setTempFilters({ category: null, muscle: null })}
              >
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalFooterBtn, { backgroundColor: theme.primary, marginLeft: 12 }]}
                onPress={() => { setFilters(tempFilters); setShowFilterModal(false); }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Appliquer les filtres</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modale d'édition rapide */}
      <Modal visible={!!editingExercise} transparent animationType="fade" onRequestClose={() => setEditingExercise(null)}>
        <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
          <View style={[{ padding: 24, width: '100%', backgroundColor: theme.background, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingExercise?.is_official ? "Exercice Officiel" : "Modifier l'exercice"}
              </Text>
              <TouchableOpacity onPress={() => setEditingExercise(null)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.text }]}>Nom de l'exercice</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, marginBottom: 16, opacity: editingExercise?.is_official ? 0.7 : 1 }]}
              value={editName}
              onChangeText={setEditName}
              editable={!editingExercise?.is_official}
            />

            {!editingExercise?.is_official && (
              <>
                <Text style={[styles.label, { color: theme.text }]}>Catégorie</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.chip, { 
                        backgroundColor: editCategory === cat ? theme.primary : theme.card,
                        borderColor: editCategory === cat ? theme.primary : theme.border,
                        marginRight: 8
                      }]}
                      onPress={() => {
                        setEditCategory(cat);
                        if (cat === 'Abdo' || cat === 'Escalier') setEditMuscle('');
                      }}
                    >
                      <Text style={{ color: editCategory === cat ? '#fff' : theme.text, fontWeight: '500', fontSize: 13 }}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {editCategory !== 'Abdo' && editCategory !== 'Escalier' && (
                  <>
                    <Text style={[styles.label, { color: theme.text }]}>Groupe musculaire</Text>
                    <View style={[styles.chipContainer, { marginBottom: 16 }]}>
                      {muscles.map(muscle => (
                        <TouchableOpacity
                          key={muscle}
                          style={[styles.chip, { 
                            backgroundColor: editMuscle === muscle ? theme.primary : theme.card,
                            borderColor: editMuscle === muscle ? theme.primary : theme.border 
                          }]}
                          onPress={() => setEditMuscle(muscle)}
                        >
                          <Text style={{ color: editMuscle === muscle ? '#fff' : theme.text, fontWeight: '500', fontSize: 13 }}>{muscle}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}

            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, minHeight: 100, textAlignVertical: 'top', marginBottom: 24 }]}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
              editable={true}
            />

            <TouchableOpacity 
              style={{ backgroundColor: theme.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
              onPress={saveQuickEdit}
              disabled={isSavingEdit}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {isSavingEdit ? "Enregistrement..." : "Enregistrer"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold' },
  backBtn: { padding: 8, marginLeft: -8 },
  addBtn: { padding: 8, marginRight: -8 },
  
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 10, borderRadius: 12, padding: 4, borderWidth: 1 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabText: { fontWeight: '600', fontSize: 14 },
  
  searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  
  filterBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  filterBadge: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#fff' },
  
  activeFilterPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  
  resultCount: { paddingHorizontal: 20, fontSize: 13, marginBottom: 10, fontWeight: '500' },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  cardCategory: { fontSize: 12, fontWeight: '600' },
  cardDesc: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  actionBtnText: { marginLeft: 4, fontSize: 13, fontWeight: '500' },
  
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyStateText: { marginTop: 16, fontSize: 16, fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  filterSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  modalFooter: { flexDirection: 'row', paddingTop: 16, borderTopWidth: 1 },
  modalFooterBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 12, borderRadius: 8, borderWidth: 1, fontSize: 16 },
});
