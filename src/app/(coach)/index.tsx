import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Share, FlatList } from 'react-native';
import { useTheme } from '../../hooks/useThemeColor';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import QRCode from 'react-native-qrcode-svg';
import { WheelColumn } from '../../components/WheelColumn';
import { bioflowStore } from '../../stores/BioflowStore';
import { useRouter } from 'expo-router';

export default function GroupScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCapacityPicker, setShowCapacityPicker] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Formulaire de création
  const [groupName, setGroupName] = useState('');
  const [maxAthletes, setMaxAthletes] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Sous-groupes
  const [subgroups, setSubgroups] = useState<any[]>([]);
  const [activeSubgroup, setActiveSubgroup] = useState<any>(null);
  const [subgroupMemberships, setSubgroupMemberships] = useState<Record<string, string>>({});
  const [showSubgroupModal, setShowSubgroupModal] = useState(false);
  const [subgroupName, setSubgroupName] = useState('');
  const [isCreatingSubgroup, setIsCreatingSubgroup] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAthleteForAssign, setSelectedAthleteForAssign] = useState<any>(null);

  const qrRef = useRef<any>(null);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      fetchAthletes();
      fetchSubgroups();
      
      const channel = supabase
        .channel('public:group_members')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `group_id=eq.${selectedGroup.id}` }, payload => {
          console.log('New member!', payload);
          fetchAthletes(); // Re-fetch to get the profile data joined
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coach_groups')
      .select('*')
      .eq('coach_id', user?.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setGroups(data);
      if (data.length > 0 && !selectedGroup) {
        setSelectedGroup(data[0]);
      }
    }
    setLoading(false);
  };

  const fetchSubgroups = async () => {
    if (!selectedGroup) return;
    const { data: sgData } = await supabase
      .from('coach_subgroups')
      .select('*')
      .eq('group_id', selectedGroup.id)
      .order('created_at', { ascending: true });
    
    if (sgData) {
      setSubgroups(sgData);
      
      const { data: memData } = await supabase
        .from('subgroup_members')
        .select('subgroup_id, athlete_id')
        .in('subgroup_id', sgData.map(g => g.id));
        
      if (memData) {
        const mapping: Record<string, string> = {};
        memData.forEach(m => {
          mapping[m.athlete_id] = m.subgroup_id;
        });
        setSubgroupMemberships(mapping);
      }
    }
  };

  const [averageForm, setAverageForm] = useState<number | null>(null);

  const fetchAthletes = async () => {
    if (!selectedGroup) return;
    setLoadingAthletes(true);
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id,
        joined_at,
        profiles:athlete_id (
          id,
          firstname,
          lastname
        )
      `)
      .eq('group_id', selectedGroup.id)
      .order('joined_at', { ascending: false });

    if (!error && data) {
      // Set initial athletes
      
      // Calculate today's date ID
      const today = new Date();
      const todayId = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      
      // Get all athlete IDs
      const athleteIds = data
        .map((member: any) => member.profiles?.id)
        .filter(Boolean);
        
      if (athleteIds.length > 0) {
        // Fetch today's checkins for these athletes
        const { data: checkinsData } = await supabase
          .from('checkins')
          .select('user_id, score')
          .eq('id', todayId)
          .in('user_id', athleteIds);
          
        if (checkinsData && checkinsData.length > 0) {
          // Calculate average
          const sum = checkinsData.reduce((acc, curr) => acc + (curr.score || 0), 0);
          setAverageForm(Math.round(sum / checkinsData.length));
          
          // Map scores to athletes
          const athletesWithScores = data.map((member: any) => {
            const checkin = checkinsData.find(c => c.user_id === member.profiles?.id);
            return {
              ...member,
              todayScore: checkin ? checkin.score : null
            };
          });
          setAthletes(athletesWithScores);
        } else {
          setAverageForm(null);
          setAthletes(data);
        }
      } else {
        setAverageForm(null);
        setAthletes(data);
      }
    }
    setLoadingAthletes(false);
  };

  const generateJoinCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner un nom de groupe.');
      return;
    }
    setIsCreating(true);
    const joinCode = generateJoinCode();
    
    const { data, error } = await supabase
      .from('coach_groups')
      .insert({
        coach_id: user?.id,
        name: groupName,
        max_athletes: maxAthletes,
        description: description,
        join_code: joinCode
      })
      .select()
      .single();
      
    setIsCreating(false);
    
    if (error) {
      bioflowStore.trigger('error');
      Alert.alert('Erreur', error.message);
    } else {
      bioflowStore.trigger('success');
      setShowCreateModal(false);
      setGroupName('');
      setDescription('');
      setMaxAthletes(10);
      setGroups([data, ...groups]);
      setSelectedGroup(data);
      setShowDropdown(false);
    }
  };

  const shareJoinCode = async (code: string) => {
    try {
      await Share.share({
        message: `Rejoignez mon groupe d'entraînement BioAthlete avec le code d'invitation : ${code}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleAssignAthleteSubgroup = async (subgroupId: string | null) => {
    if (!selectedAthleteForAssign) return;

    const currentSubgroupId = subgroupMemberships[selectedAthleteForAssign.id];
    if (currentSubgroupId) {
      await supabase.from('subgroup_members').delete().eq('athlete_id', selectedAthleteForAssign.id).eq('subgroup_id', currentSubgroupId);
    }

    if (subgroupId) {
      await supabase.from('subgroup_members').insert({
        subgroup_id: subgroupId,
        athlete_id: selectedAthleteForAssign.id
      });
    }
    
    setSubgroupMemberships(prev => {
      const next = { ...prev };
      if (subgroupId) {
        next[selectedAthleteForAssign.id] = subgroupId;
      } else {
        delete next[selectedAthleteForAssign.id];
      }
      return next;
    });

    setShowAssignModal(false);
    setSelectedAthleteForAssign(null);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="groups" size={80} color={theme.icon} style={{ opacity: 0.5, marginBottom: 20 }} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun groupe créé</Text>
      <Text style={[styles.emptyDesc, { color: theme.text }]}>
        Créez votre premier groupe pour inviter des athlètes et commencer à planifier leurs entraînements.
      </Text>
      <CustomButton 
        title="Créer mon premier groupe" 
        onPress={() => setShowCreateModal(true)} 
        style={{ marginTop: 30, width: '100%' }}
      />
    </View>
  );

  const capacityData = Array.from({ length: 100 }, (_, i) => ({ label: `${i + 1} athlètes`, value: i + 1 }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        title={selectedGroup ? selectedGroup.name : 'Mes groupes'}  
        onPressTitle={() => setShowDropdown(true)}
      />
      
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : selectedGroup ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View>
              {/* Infos Groupe & QR Code */}
              <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, { backgroundColor: theme.primary + '20' }]}>
                    <MaterialIcons name="people" size={16} color={theme.primary} />
                    <Text style={[styles.statText, { color: theme.primary }]}>{athletes.length} / {selectedGroup.max_athletes} Athlètes</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: theme.primary + '15', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => setShowInviteModal(true)}
                  >
                    <MaterialIcons name="qr-code" size={18} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontWeight: 'bold', marginLeft: 8 }}>Code d'invitation</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={{ flex: 1, backgroundColor: theme.secondary + '15', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => router.push({ pathname: '/(coach)/subgroups', params: { groupId: selectedGroup.id } })}
                  >
                    <MaterialIcons name="category" size={18} color={theme.secondary} />
                    <Text style={{ color: theme.secondary, fontWeight: 'bold', marginLeft: 8 }}>Sous-groupes</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forme Moyenne */}
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Forme Moyenne du Groupe</Text>
                {averageForm !== null ? (
                  <>
                    <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                      <View style={[styles.progressFill, { width: `${averageForm}%`, backgroundColor: averageForm >= 75 ? '#10B981' : averageForm >= 50 ? '#F59E0B' : '#EF4444' }]} />
                    </View>
                    <Text style={[styles.progressValue, { color: averageForm >= 75 ? '#10B981' : averageForm >= 50 ? '#F59E0B' : '#EF4444' }]}>{averageForm} / 100</Text>
                  </>
                ) : (
                  <Text style={{ color: theme.icon, marginTop: 10 }}>Aucun check-in aujourd'hui.</Text>
                )}
              </View>

              {/* Liste des athlètes */}
              <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border, padding: 0, overflow: 'hidden' }]}>
                <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: theme.border }}>
                  <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>Athlètes</Text>
                </View>
                
                {subgroups.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, maxHeight: 60 }}>
                    <TouchableOpacity
                      style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: theme.primary }, activeSubgroup === null ? { backgroundColor: theme.primary } : { backgroundColor: 'transparent' }]}
                      onPress={() => setActiveSubgroup(null)}
                    >
                      <Text style={{ color: activeSubgroup === null ? '#FFF' : theme.primary, fontWeight: 'bold' }}>Tous</Text>
                    </TouchableOpacity>
                    {subgroups.map(sg => (
                      <TouchableOpacity
                        key={sg.id}
                        style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: theme.border }, activeSubgroup?.id === sg.id ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.surfaceSecondary }]}
                        onPress={() => setActiveSubgroup(sg)}
                      >
                        <Text style={{ color: activeSubgroup?.id === sg.id ? '#FFF' : theme.text, fontWeight: 'bold' }}>{sg.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                {loadingAthletes ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ padding: 20 }} />
                ) : athletes.length === 0 ? (
                  <Text style={{ color: theme.icon, padding: 20, textAlign: 'center' }}>Aucun athlète dans ce groupe.</Text>
                ) : (
                  (() => {
                    const filteredAthletes = activeSubgroup 
                      ? athletes.filter(a => subgroupMemberships[a.profiles?.id] === activeSubgroup.id)
                      : athletes;
                      
                    if (filteredAthletes.length === 0) {
                      return <Text style={{ color: theme.icon, padding: 20, textAlign: 'center' }}>Aucun athlète dans ce sous-groupe.</Text>;
                    }

                    return filteredAthletes.map((item, index) => {
                      const firstname = item.profiles?.firstname || 'Inconnu';
                      const lastname = item.profiles?.lastname ? item.profiles.lastname[0] + '.' : '';
                      const score = item.todayScore;
                      const athleteSubgroup = subgroups.find(sg => sg.id === subgroupMemberships[item.profiles?.id]);
                    return (
                      <TouchableOpacity 
                        key={item.id} 
                        style={[styles.athleteRow, { borderBottomColor: theme.border, borderBottomWidth: index === athletes.length - 1 ? 0 : 1 }]}
                        onPress={() => router.push(`/(coach)/athlete/${item.profiles?.id}` as any)}
                        onLongPress={() => {
                          setSelectedAthleteForAssign(item.profiles);
                          setShowAssignModal(true);
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                             <MaterialIcons name="person" size={20} color={theme.primary} />
                          </View>
                          <View>
                            <Text style={[styles.athleteName, { color: theme.text, marginBottom: athleteSubgroup ? 2 : 0 }]}>
                              {firstname} {lastname}
                            </Text>
                            {athleteSubgroup && (
                              <Text style={{ fontSize: 11, color: theme.icon, fontWeight: 'bold' }}>
                                {athleteSubgroup.name}
                              </Text>
                            )}
                          </View>
                        </View>
                        {score !== null && score !== undefined ? (
                          <View style={[styles.athleteScoreBadge, { backgroundColor: score >= 75 ? '#10B98120' : score >= 50 ? '#F59E0B20' : '#EF444420' }]}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444' }}>{score}</Text>
                          </View>
                        ) : (
                          <View style={[styles.athleteScoreBadge, { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border }]}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.icon }}>En attente</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    )
                  })
                 })()
                )}
              </View>

            </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderEmptyState()}
        </ScrollView>
      )}

      {/* Modal / Menu déroulant pour changer de groupe */}
      <Modal visible={showDropdown} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowDropdown(false)}>
          <View style={[styles.dropdownContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.dropdownHeader, { color: theme.icon }]}>Sélectionner un groupe</Text>
            {groups.map(g => (
              <TouchableOpacity 
                key={g.id} 
                style={[styles.dropdownItem, selectedGroup?.id === g.id && { backgroundColor: theme.primary + '10' }]} 
                onPress={() => {
                  setSelectedGroup(g);
                  setShowDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: theme.text, fontWeight: selectedGroup?.id === g.id ? 'bold' : 'normal' }]}>
                  {g.name}
                </Text>
                {selectedGroup?.id === g.id && <MaterialIcons name="check" size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 8 }} />
            <TouchableOpacity 
              style={[styles.dropdownItem, { justifyContent: 'center' }]} 
              onPress={() => {
                setShowDropdown(false);
                setShowCreateModal(true);
              }}
            >
              <MaterialIcons name="add" size={20} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Créer un autre groupe</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de Création */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Nouveau groupe</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialIcons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={[styles.label, { color: theme.text }]}>Nom du groupe *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: Sprint élite 2026"
              placeholderTextColor={theme.icon}
              value={groupName}
              onChangeText={setGroupName}
            />

            <Text style={[styles.label, { color: theme.text }]}>Capacité maximale d'athlètes</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, justifyContent: 'center' }]}
              onPress={() => setShowCapacityPicker(true)}
            >
              <Text style={{ color: theme.text, fontSize: 16 }}>{maxAthletes} athlètes</Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: theme.text }]}>Description (optionnelle)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, height: 100, textAlignVertical: 'top' }]}
              placeholder="Groupe d'entraînement pour la préparation estivale..."
              placeholderTextColor={theme.icon}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <CustomButton 
              title={isCreating ? "Création en cours..." : "Créer le groupe"} 
              onPress={handleCreateGroup} 
              style={{ marginTop: 30 }}
              disabled={isCreating}
            />
          </ScrollView>
        </View>
      </Modal>
      
      {/* Modal de Capacité */}
      <Modal visible={showCapacityPicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card }]}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowCapacityPicker(false)}>
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: 'bold' }}>Terminé</Text>
              </TouchableOpacity>
            </View>
            <WheelColumn 
               data={capacityData} 
               value={maxAthletes} onChange={(v) => setMaxAthletes(v as number)} 
            />
          </View>
        </View>
      </Modal>

      {/* Modal d'invitation */}
      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: theme.card, borderRadius: 24, padding: 24, width: '100%', alignItems: 'center' }}>
            <TouchableOpacity 
              style={{ position: 'absolute', top: 16, right: 16 }}
              onPress={() => setShowInviteModal(false)}
            >
              <MaterialIcons name="close" size={24} color={theme.icon} />
            </TouchableOpacity>
            
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 8, marginTop: 8 }}>Inviter des athlètes</Text>
            <Text style={{ color: theme.icon, fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
              Partagez ce code ou ce QR code avec vos athlètes pour qu'ils rejoignent "{selectedGroup?.name}".
            </Text>
            
            <Text style={{ color: theme.primary, fontSize: 32, fontWeight: '900', letterSpacing: 8, marginBottom: 24 }}>
              {selectedGroup?.join_code}
            </Text>
            
            <View style={{ padding: 16, backgroundColor: '#FFF', borderRadius: 16, marginBottom: 24 }}>
              <QRCode
                value={selectedGroup?.join_code || 'BIOATHLETE'}
                size={150}
                getRef={(c: any) => (qrRef.current = c)}
              />
            </View>
            
            <CustomButton 
              title="Partager le code" 
              onPress={() => shareJoinCode(selectedGroup?.join_code)}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal d'assignation de sous-groupe */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card, paddingBottom: 40 }]}>
            <View style={[styles.pickerHeader, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold' }}>
                Sous-groupe pour {selectedAthleteForAssign?.firstname}
              </Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: 'bold' }}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <TouchableOpacity
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between' }}
                onPress={() => handleAssignAthleteSubgroup(null)}
              >
                <Text style={{ color: theme.text, fontSize: 16 }}>Aucun sous-groupe (Tous)</Text>
                {(!selectedAthleteForAssign || !subgroupMemberships[selectedAthleteForAssign.id]) && <MaterialIcons name="check" size={20} color={theme.primary} />}
              </TouchableOpacity>
              
              {subgroups.map(sg => {
                const isSelected = selectedAthleteForAssign && subgroupMemberships[selectedAthleteForAssign.id] === sg.id;
                return (
                  <TouchableOpacity
                    key={sg.id}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border, flexDirection: 'row', justifyContent: 'space-between' }}
                    onPress={() => handleAssignAthleteSubgroup(sg.id)}
                  >
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: isSelected ? 'bold' : 'normal' }}>{sg.name}</Text>
                    {isSelected && <MaterialIcons name="check" size={20} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  emptyDesc: { fontSize: 16, textAlign: 'center', opacity: 0.7, paddingHorizontal: 20 },
  
  groupCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  
  qrContainer: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  qrTitle: { opacity: 0.8, marginBottom: 8 },
  qrCode: { fontWeight: '900', letterSpacing: 4 },
  qrWrapper: { backgroundColor: 'white', borderRadius: 16 },
  
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
  },
  shareText: { fontWeight: '600', marginLeft: 8 },

  section: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  progressBg: {
    height: 12,
    borderRadius: 6,
    width: '100%',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  athleteName: {
    fontSize: 16,
    fontWeight: '600',
  },
  athleteScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingTop: 100, // Position sous le header
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
  },
  dropdownItemText: {
    fontSize: 16,
  },

  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerContainer: { height: 300, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  pickerHeader: { padding: 16, alignItems: 'flex-end', borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' }
});
