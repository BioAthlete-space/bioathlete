import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../hooks/useThemeColor';
import { useAthleteProfile } from '../../hooks/useAthleteProfile';
import { useAuth } from '../../providers/AuthProvider';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { FormRow } from '../../components/FormRow';
import { Card } from '../../components/Card';
import { SelectionModal } from '../../components/SelectionModal';
import { MultiSelectionModal } from '../../components/MultiSelectionModal';
import { DatePickerModal } from '../../components/DatePickerModal';
import { HeightPickerModal } from '../../components/HeightPickerModal';
import { COUNTRIES } from '../../constants/Countries';
import { DISCIPLINES } from '../../constants/Disciplines';

export default function AccountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { signOut, user } = useAuth();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth' as any);
  };

  // ── HOOK DE PERSISTANCE ──
  const { profile, updateField, saveNow, isLoading, isSaving, isSaved, error, hasChanges } = useAthleteProfile();

  const [activeModal, setActiveModal] = useState<'sexe' | 'dateNaissance' | 'taille' | 'disciplines' | null>(null);

  const handleEditPhoto = () => {
    Alert.alert(
      'Modifier la photo',
      'Choisissez une option',
      [
        {
          text: 'Prendre une photo',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert('Permission refusée', 'Vous avez refusé l\'accès à la caméra.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              updateField('photoUrl' as any, result.assets[0].uri);
            }
          }
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert('Permission refusée', 'Vous avez refusé l\'accès aux photos.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              updateField('photoUrl' as any, result.assets[0].uri);
            }
          }
        },
        { text: 'Annuler', style: 'cancel' }
      ]
    );
  };

  const sexeOptions = [
    { label: 'Homme', value: 'Homme', icon: 'male' },
    { label: 'Femme', value: 'Femme', icon: 'female' },
    { label: 'Autre', value: 'Autre', icon: 'transgender' },
  ];

  const countryOptions = COUNTRIES.map(c => ({
    label: c.name,
    value: c.name,
    imageUrl: `https://flagcdn.com/w40/${c.code}.png`
  }));

  const niveauOptions = [
    { label: 'Débutant', value: 'Débutant', icon: 'directions-walk' },
    { label: 'Régional', value: 'Régional', icon: 'map' },
    { label: 'National', value: 'National', icon: 'flag' },
    { label: 'International', value: 'International', icon: 'public' },
  ];

  const niveauFfaOptions = [
    { label: 'IA', value: 'IA', category: 'International' },
    { label: 'IB', value: 'IB', category: 'International' },
    { label: 'N1', value: 'N1', category: 'National' },
    { label: 'N2', value: 'N2', category: 'National' },
    { label: 'N3', value: 'N3', category: 'National' },
    { label: 'N4', value: 'N4', category: 'National' },
    { label: 'R1', value: 'R1', category: 'Régional' },
    { label: 'R2', value: 'R2', category: 'Régional' },
    { label: 'R3', value: 'R3', category: 'Régional' },
    { label: 'R4', value: 'R4', category: 'Régional' },
    { label: 'R5', value: 'R5', category: 'Régional' },
    { label: 'R6', value: 'R6', category: 'Régional' },
    { label: 'D1', value: 'D1', category: 'Départemental' },
    { label: 'D2', value: 'D2', category: 'Départemental' },
    { label: 'D3', value: 'D3', category: 'Départemental' },
    { label: 'D4', value: 'D4', category: 'Départemental' },
    { label: 'D5', value: 'D5', category: 'Départemental' },
    { label: 'D6', value: 'D6', category: 'Départemental' },
    { label: 'D7', value: 'D7', category: 'Départemental' },
    { label: 'D8', value: 'D8', category: 'Départemental' },
    { label: 'D9', value: 'D9', category: 'Départemental' },
    { label: 'D10', value: 'D10', category: 'Départemental' },
  ];

  const disciplineOptions = DISCIPLINES.flatMap(cat => 
    cat.items.map(item => ({ label: item, value: item, category: cat.title }))
  );

  const handleSave = async () => {
    const success = await saveNow();
    if (success) {
      goBack();
    } else {
      Alert.alert('Erreur', 'La sauvegarde a échoué. Veuillez réessayer.');
    }
  };

  // ── ÉCRAN DE CHARGEMENT ──
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.icon }]}>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Mon compte" 
        leftContent={
          <TouchableOpacity onPress={goBack} style={{ padding: Layout.spacing.sm, marginLeft: -Layout.spacing.sm }}>
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
        rightContent={
          <View style={styles.saveStatusContainer}>
            {isSaving && (
              <View style={styles.saveIndicator}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.saveStatusText, { color: theme.primary }]}>Enregistrement...</Text>
              </View>
            )}
            {isSaved && !isSaving && (
              <View style={styles.saveIndicator}>
                <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                <Text style={[styles.saveStatusText, { color: '#4CAF50' }]}>Enregistré</Text>
              </View>
            )}
            {error && !isSaving && (
              <View style={styles.saveIndicator}>
                <MaterialIcons name="error" size={16} color="#FF3B30" />
                <Text style={[styles.saveStatusText, { color: '#FF3B30' }]}>Erreur</Text>
              </View>
            )}
          </View>
        }
      />
      
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Photo de profil */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handleEditPhoto} style={[styles.avatar, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border, overflow: 'hidden' }]}>
            {(profile as any).photoUrl ? (
              <Image source={{ uri: (profile as any).photoUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <MaterialIcons name="camera-alt" size={32} color={theme.icon} />
            )}
          </TouchableOpacity>
          <Text style={[styles.avatarText, { color: theme.primary }]} onPress={handleEditPhoto}>Modifier la photo</Text>
        </View>

        {/* Section Profil */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Profil</Text>
        <Card style={styles.card} padding="none">
          <FormRow label="Nom" value={profile.nom} onChangeText={(v) => updateField('nom', v)} type="input" icon="person" />
          <FormRow label="Prénom" value={profile.prenom} onChangeText={(v) => updateField('prenom', v)} type="input" />
          <FormRow label="Email" value={profile.email || user?.email || ''} type="text" icon="email" />
          <FormRow label="Date de naissance" value={profile.dateNaissance} type="select" icon="cake" onPress={() => setActiveModal('dateNaissance')} />
          <FormRow label="Sexe" value={profile.sexe} type="select" icon="wc" onPress={() => setActiveModal('sexe')} />
          <FormRow label="Mes disciplines" value={profile.mesDisciplines.length > 0 ? profile.mesDisciplines.join(', ') : 'Aucune'} type="select" icon="directions-run" onPress={() => setActiveModal('disciplines')} isLast />
        </Card>

        {/* Section Informations Physiques */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Informations Physiques</Text>
        <Card style={styles.card} padding="none">
          <FormRow label="Taille" value={profile.taille} type="select" icon="height" onPress={() => setActiveModal('taille')} />
          <FormRow label="Synchroniser les données de santé" value="Apple Santé / Google Fit" type="select" icon="favorite" onPress={() => router.push('/profile/health-sync')} isLast />
        </Card>

        {/* Section Préférences */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Préférences</Text>
        <Card style={styles.card} padding="none">
          <FormRow label="Langue" value={profile.langue} type="select" icon="language" onPress={() => Alert.alert('À venir', 'Sélection de la langue')} isLast />
        </Card>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sécurité du compte</Text>
        <Card style={styles.card} padding="none">
          <FormRow 
            label="Modifier le mot de passe" 
            value="" 
            type="select" 
            icon="lock" 
            onPress={() => router.push('/profile/password')} 
          />
          <FormRow 
            label="Supprimer le compte" 
            value="" 
            type="select" 
            icon="delete-forever" 
            onPress={() => {
              Alert.alert(
                'Supprimer le compte', 
                'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Supprimer', style: 'destructive', onPress: () => Alert.alert('Non implémenté', 'La suppression sera disponible prochainement.') }
                ]
              );
            }} 
            isLast 
          />
        </Card>

      </ScrollView>

      {/* Bouton Fixe */}
      <View style={[styles.bottomBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <CustomButton 
          title={isSaving ? "Enregistrement..." : "Enregistrer les modifications"} 
          onPress={handleSave}
        />
      </View>

      {/* Modals */}
      <HeightPickerModal
        visible={activeModal === 'taille'}
        onClose={() => setActiveModal(null)}
        initialHeight={profile.taille}
        onConfirm={(h) => updateField('taille', h)}
      />

      <DatePickerModal
        visible={activeModal === 'dateNaissance'}
        onClose={() => setActiveModal(null)}
        initialDate={profile.dateNaissance}
        onConfirm={(date) => updateField('dateNaissance', date)}
      />

      <SelectionModal 
        visible={activeModal === 'sexe'} 
        onClose={() => setActiveModal(null)} 
        title="Sélectionner votre sexe" 
        options={sexeOptions} 
        onSelect={(val) => updateField('sexe', val)} 
      />

      <MultiSelectionModal
        visible={activeModal === 'disciplines'}
        onClose={() => setActiveModal(null)}
        title="Mes disciplines"
        searchable
        options={disciplineOptions}
        selectedValues={profile.mesDisciplines}
        onConfirm={(vals) => updateField('mesDisciplines', vals)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Layout.spacing.md,
    fontSize: Typography.sizes.md,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xl, 
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.sm,
  },
  avatarText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold as any,
    textTransform: 'uppercase',
    marginBottom: Layout.spacing.md,
    marginLeft: Layout.spacing.xs,
    marginTop: Layout.spacing.lg,
  },
  card: {
    marginBottom: Layout.spacing.sm,
  },
  bottomBar: {
    padding: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
    borderTopWidth: 1,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  saveStatusContainer: {
    minWidth: 120,
    alignItems: 'flex-end',
  },
  saveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveStatusText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
  },
});

