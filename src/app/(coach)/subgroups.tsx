import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { Header } from '../../components/Header';
import { supabase } from '../../lib/supabase';
import { CustomButton } from '../../components/CustomButton';

export default function SubgroupsScreen() {
  const { groupId } = useLocalSearchParams();
  const theme = useTheme();
  const router = useRouter();

  const [subgroups, setSubgroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState('');
  
  // To manage athletes assignment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSubgroup, setSelectedSubgroup] = useState<any>(null);
  const [groupAthletes, setGroupAthletes] = useState<any[]>([]);
  const [subgroupMembers, setSubgroupMembers] = useState<string[]>([]); // athlete_ids
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchSubgroups();
      fetchGroupAthletes();
    }
  }, [groupId]);

  const fetchSubgroups = async () => {
    const { data, error } = await supabase
      .from('coach_subgroups')
      .select('*, subgroup_members(athlete_id)')
      .eq('group_id', groupId);

    if (!error && data) {
      setSubgroups(data);
    }
    setLoading(false);
  };

  const fetchGroupAthletes = async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select('profiles:athlete_id(id, firstname, lastname)')
      .eq('group_id', groupId);
    
    if (!error && data) {
      setGroupAthletes(data.map((d: any) => d.profiles));
    }
  };

  const handleCreateSubgroup = async () => {
    if (!newSubgroupName.trim()) return;
    
    const { data, error } = await supabase
      .from('coach_subgroups')
      .insert({ group_id: groupId, name: newSubgroupName })
      .select()
      .single();

    if (!error && data) {
      setSubgroups([...subgroups, { ...data, subgroup_members: [] }]);
      setShowCreateModal(false);
      setNewSubgroupName('');
    } else {
      Alert.alert('Erreur', error?.message);
    }
  };

  const openAssignModal = (subgroup: any) => {
    setSelectedSubgroup(subgroup);
    setSubgroupMembers(subgroup.subgroup_members.map((m: any) => m.athlete_id));
    setShowAssignModal(true);
  };

  const toggleAthleteInSubgroup = (athleteId: string) => {
    if (subgroupMembers.includes(athleteId)) {
      setSubgroupMembers(subgroupMembers.filter(id => id !== athleteId));
    } else {
      setSubgroupMembers([...subgroupMembers, athleteId]);
    }
  };

  const handleSaveAssignments = async () => {
    setIsAssigning(true);
    // 1. Delete all existing members for this subgroup
    await supabase.from('subgroup_members').delete().eq('subgroup_id', selectedSubgroup.id);
    
    // 2. Insert new members
    if (subgroupMembers.length > 0) {
      const inserts = subgroupMembers.map(id => ({
        subgroup_id: selectedSubgroup.id,
        athlete_id: id
      }));
      await supabase.from('subgroup_members').insert(inserts);
    }
    
    setIsAssigning(false);
    setShowAssignModal(false);
    fetchSubgroups(); // Refresh
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginLeft: 10 }}>Sous-groupes</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <CustomButton 
            title="+ Créer un sous-groupe" 
            onPress={() => setShowCreateModal(true)} 
            style={{ marginBottom: 20 }}
          />

          {subgroups.length === 0 ? (
            <Text style={{ color: theme.icon, textAlign: 'center', marginTop: 20 }}>
              Aucun sous-groupe. Créez-en un pour diviser vos athlètes (ex: Sprinteurs, Lanceurs).
            </Text>
          ) : (
            subgroups.map((sg) => (
              <View key={sg.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={[styles.sgName, { color: theme.text }]}>{sg.name}</Text>
                    <Text style={{ color: theme.icon }}>{sg.subgroup_members?.length || 0} athlète(s)</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.manageBtn, { backgroundColor: theme.primary + '20' }]}
                    onPress={() => openAssignModal(sg)}
                  >
                    <MaterialIcons name="people" size={20} color={theme.primary} />
                    <Text style={{ color: theme.primary, marginLeft: 8, fontWeight: '600' }}>Gérer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Modal Création Sous-groupe */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Nouveau sous-groupe</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Demi-fond"
              placeholderTextColor={theme.icon}
              value={newSubgroupName}
              onChangeText={setNewSubgroupName}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={{ padding: 10, marginRight: 10 }}>
                <Text style={{ color: theme.icon }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateSubgroup} style={{ padding: 10, backgroundColor: theme.primary, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Assigner Athlètes */}
      <Modal visible={showAssignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.pageSheet, { backgroundColor: theme.background }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Athlètes: {selectedSubgroup?.name}</Text>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <MaterialIcons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: 20 }}>
            {groupAthletes.map(athlete => {
              const isSelected = subgroupMembers.includes(athlete.id);
              return (
                <TouchableOpacity 
                  key={athlete.id}
                  style={[styles.athleteRow, { borderBottomColor: theme.border }]}
                  onPress={() => toggleAthleteInSubgroup(athlete.id)}
                >
                  <Text style={{ color: theme.text, fontSize: 16 }}>{athlete.firstname} {athlete.lastname}</Text>
                  <MaterialIcons 
                    name={isSelected ? "check-box" : "check-box-outline-blank"} 
                    size={24} 
                    color={isSelected ? theme.primary : theme.icon} 
                  />
                </TouchableOpacity>
              );
            })}
            <CustomButton 
              title={isAssigning ? "Enregistrement..." : "Enregistrer"} 
              onPress={handleSaveAssignments}
              style={{ marginTop: 30, marginBottom: 50 }}
              disabled={isAssigning}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  card: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  sgName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', padding: 20, borderRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  
  pageSheet: { flex: 1 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  athleteRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 }
});
