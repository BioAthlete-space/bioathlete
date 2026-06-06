import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { supabase } from '../../lib/supabase';
import { router, useFocusEffect } from 'expo-router';

export default function SessionLibraryScreen() {
  const theme = useTheme();
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<string | null>(null);

  const SESSION_TYPES = [
    'Aérobie', 'Lactique', 'Musculation', 'Récupération', 
    'Mobilité', 'Plyométrie', 'Technique', 'Escalier', 'Libre'
  ];

  useFocusEffect(
    useCallback(() => {
      fetchTemplates();
    }, [])
  );

  const fetchTemplates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('coach_id', user.id)
      .order('created_at', { ascending: false });
      
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, name: string) => {
    Alert.alert(
      'Suppression',
      `Êtes-vous sûr de vouloir supprimer le modèle "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('workout_templates').delete().eq('id', id);
            if (error) Alert.alert('Erreur', error.message);
            else fetchTemplates();
          }
        }
      ]
    );
  };

  const handleDuplicate = async (template: any) => {
    const { id, created_at, updated_at, ...rest } = template;
    const { error } = await supabase
      .from('workout_templates')
      .insert({
        ...rest,
        name: `${template.name} (Copie)`
      });

    if (error) Alert.alert('Erreur', error.message);
    else fetchTemplates();
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (activeType && t.type !== activeType) return false;
      if (searchQuery) {
        return t.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [templates, activeType, searchQuery]);

  const renderTemplate = ({ item }: { item: any }) => {
    const blockCount = item.content?.blocks?.length || 0;
    
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{item.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <View style={[styles.typePill, { backgroundColor: theme.primary + '20' }]}>
                <Text style={{ color: theme.primary, fontSize: 12, fontWeight: '600' }}>{item.type}</Text>
              </View>
              <Text style={{ color: theme.icon, fontSize: 13, marginLeft: 8 }}>
                {blockCount} bloc(s)
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity onPress={() => handleDuplicate(item)} style={{ padding: 6 }}>
              <MaterialIcons name="content-copy" size={20} color={theme.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push(`/sessions/create?editId=${item.id}`)} style={{ padding: 6 }}>
              <MaterialIcons name="edit" size={20} color={theme.icon} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={{ padding: 6 }}>
              <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Séances</Text>
        <TouchableOpacity onPress={() => router.push('/sessions/create')} style={styles.addBtn}>
          <MaterialIcons name="add" size={24} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <MaterialIcons name="search" size={20} color={theme.icon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher une séance..."
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
      </View>

      {/* Categories Filter */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
          <TouchableOpacity
            style={[styles.chip, { 
              backgroundColor: activeType === null ? theme.primary : theme.card,
              borderColor: activeType === null ? theme.primary : theme.border 
            }]}
            onPress={() => setActiveType(null)}
          >
            <Text style={{ color: activeType === null ? '#fff' : theme.text, fontWeight: '500' }}>Tout</Text>
          </TouchableOpacity>
          
          {SESSION_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.chip, { 
                backgroundColor: activeType === type ? theme.primary : theme.card,
                borderColor: activeType === type ? theme.primary : theme.border 
              }]}
              onPress={() => setActiveType(type)}
            >
              <Text style={{ color: activeType === type ? '#fff' : theme.text, fontWeight: '500' }}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={[styles.resultCount, { color: theme.icon }]}>
        {filteredTemplates.length} modèle(s)
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredTemplates}
          keyExtractor={(item) => item.id}
          renderItem={renderTemplate}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="event-note" size={48} color={theme.icon} />
              <Text style={[styles.emptyStateText, { color: theme.text }]}>
                {searchQuery || activeType ? "Aucun modèle ne correspond à votre recherche." : "Votre bibliothèque est vide. Créez votre premier modèle de séance !"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold' },
  backBtn: { padding: 8, marginLeft: -8 },
  addBtn: { padding: 8, marginRight: -8 },
  
  searchContainer: { paddingHorizontal: 20, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  
  resultCount: { paddingHorizontal: 20, fontSize: 13, marginBottom: 10, fontWeight: '500' },
  
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  typePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyStateText: { marginTop: 16, fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22 },
});
