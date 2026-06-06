import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from '../../components/Camera';

export default function AthleteGroupScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (user) {
      fetchMyGroups();
    }
  }, [user]);

  const fetchMyGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id,
        coach_groups (
          id,
          name,
          description,
          max_athletes
        )
      `)
      .eq('athlete_id', user?.id);

    if (!error && data) {
      setMyGroups(data);
    }
    setLoading(false);
  };

  const handleJoinGroup = async (code: string) => {
    if (!code.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code.');
      return;
    }

    setIsJoining(true);
    // 1. Chercher le groupe avec ce code
    const { data: groupData, error: groupError } = await supabase
      .from('coach_groups')
      .select('id, name')
      .eq('join_code', code.trim().toUpperCase())
      .single();

    if (groupError || !groupData) {
      setIsJoining(false);
      Alert.alert('Erreur', 'Code invalide ou groupe introuvable.');
      return;
    }

    // 2. Vérifier si l'athlète n'est pas déjà membre
    const { data: existingData } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupData.id)
      .eq('athlete_id', user?.id)
      .single();

    if (existingData) {
      setIsJoining(false);
      Alert.alert('Info', 'Vous êtes déjà membre de ce groupe.');
      closeAllModals();
      return;
    }

    // 3. Rejoindre le groupe
    const { error: joinError } = await supabase
      .from('group_members')
      .insert({
        group_id: groupData.id,
        athlete_id: user?.id,
      });

    setIsJoining(false);

    if (joinError) {
      Alert.alert('Erreur', 'Impossible de rejoindre le groupe : ' + joinError.message);
    } else {
      Alert.alert('Succès', `Vous avez rejoint le groupe "${groupData.name}" !`);
      closeAllModals();
      fetchMyGroups();
    }
  };

  const closeAllModals = () => {
    setShowOptionsModal(false);
    setShowCodeModal(false);
    setShowCameraModal(false);
    setJoinCode('');
  };

  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert('Erreur', "L'autorisation d'utiliser la caméra est requise pour scanner un QR Code.");
        return;
      }
    }
    setShowOptionsModal(false);
    setShowCameraModal(true);
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="groups" size={80} color={theme.icon} style={{ opacity: 0.5, marginBottom: 20 }} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Aucun groupe rejoint</Text>
      <Text style={[styles.emptyDesc, { color: theme.text }]}>
        Demandez le code d'invitation ou le QR Code à votre coach pour rejoindre son groupe.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Mes Groupes" 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={{ paddingRight: 20 }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 50 }} />
        ) : myGroups.length === 0 ? (
          renderEmptyState()
        ) : (
          <View>
            {myGroups.map((membership, idx) => {
              const group = membership.coach_groups;
              if (!group) return null;
              return (
                <View key={idx} style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <MaterialIcons name="fitness-center" size={24} color={theme.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.groupName, { color: theme.text }]}>{group.name}</Text>
                  </View>
                  {group.description && <Text style={[styles.groupDesc, { color: theme.icon }]}>{group.description}</Text>}
                </View>
              );
            })}
          </View>
        )}

        <CustomButton 
          title="Rejoindre un groupe" 
          onPress={() => setShowOptionsModal(true)} 
          style={{ marginTop: 30 }}
        />
      </ScrollView>

      {/* Modal : Choix Code ou Scan */}
      <Modal visible={showOptionsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.optionsModalContainer, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Rejoindre un groupe</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.optionBtn, { borderColor: theme.border }]} 
              onPress={openScanner}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: theme.primary + '20' }]}>
                <MaterialIcons name="qr-code-scanner" size={28} color={theme.primary} />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>Scanner le QR Code</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.optionBtn, { borderColor: theme.border }]} 
              onPress={() => { setShowOptionsModal(false); setShowCodeModal(true); }}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: theme.primary + '20' }]}>
                <MaterialIcons name="keyboard" size={28} color={theme.primary} />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>Saisir le code d'invitation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal : Saisie du code */}
      <Modal visible={showCodeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.optionsModalContainer, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Saisir le code</Text>
              <TouchableOpacity onPress={closeAllModals}>
                <MaterialIcons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: A8X2L9"
              placeholderTextColor={theme.icon}
              autoCapitalize="characters"
              maxLength={10}
              value={joinCode}
              onChangeText={setJoinCode}
            />

            <CustomButton 
              title={isJoining ? "Vérification..." : "Rejoindre"} 
              onPress={() => handleJoinGroup(joinCode)}
              disabled={isJoining || joinCode.length === 0}
              style={{ marginTop: 20 }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal : Scanner (Caméra) */}
      <Modal visible={showCameraModal} animationType="slide">
        <View style={[styles.cameraContainer, { backgroundColor: theme.background }]}>
          {Platform.OS === 'web' ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <MaterialIcons name="qr-code-scanner" size={60} color={theme.icon} />
              <Text style={{ color: theme.text, textAlign: 'center', marginTop: 20 }}>
                La caméra n'est pas optimisée sur la version Web. Veuillez utiliser la saisie manuelle du code ou l'application mobile.
              </Text>
              <CustomButton 
                title="Fermer" 
                onPress={closeAllModals} 
                style={{ marginTop: 40 }}
              />
            </View>
          ) : (
            <>
              <CameraView 
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onBarcodeScanned={({ data }) => {
                  if (data) {
                    setShowCameraModal(false);
                    handleJoinGroup(data);
                  }
                }}
              />
              <View style={styles.cameraOverlay}>
                <TouchableOpacity onPress={closeAllModals} style={styles.closeCameraBtn}>
                  <MaterialIcons name="close" size={28} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.scanTarget} />
                <Text style={styles.scanText}>Placez le QR Code dans le cadre</Text>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  emptyDesc: { fontSize: 16, textAlign: 'center', opacity: 0.7, paddingHorizontal: 20 },

  groupCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  groupName: { fontSize: 20, fontWeight: 'bold' },
  groupDesc: { fontSize: 14, marginTop: 4, lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  optionsModalContainer: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: { fontSize: 16, fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: 'bold',
  },

  cameraContainer: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeCameraBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
  },
  scanTarget: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 40,
    textAlign: 'center',
  }
});
