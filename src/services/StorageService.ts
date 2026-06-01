/**
 * StorageService - Point d'accès UNIQUE aux données persistées.
 * 
 * ARCHITECTURE :
 * Tous les écrans et hooks passent par ce service pour lire/écrire.
 * En interne, il utilise AsyncStorage (clé-valeur JSON).
 * 
 * REMPLACEMENT FUTUR :
 * Pour passer à SQLite, Supabase, ou une API REST :
 * 1. Modifier uniquement les fonctions internes de ce fichier
 * 2. Conserver les mêmes signatures de fonctions
 * 3. Aucun écran ni hook ne sera impacté
 * 
 * CONVENTION DE CLÉS :
 * @sprintflow/profile    → Profil athlète
 * @sprintflow/sessions   → Séances d'entraînement (futur)
 * @sprintflow/nutrition  → Données nutritionnelles (futur)
 * @sprintflow/groups     → Groupes d'entraînement (futur)
 * @sprintflow/objectives → Objectifs sportifs (futur)
 * @sprintflow/records    → Performances / Records (futur)
 * @sprintflow/settings   → Paramètres de l'app (futur)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AthleteProfile, DEFAULT_PROFILE } from '../types/AthleteProfile';
import { CheckinData } from '../types/Checkin';
import { supabase } from '../lib/supabase';

// ──────────────────────────────────────────────
// CLÉS DE STOCKAGE (centralisées ici uniquement)
// ──────────────────────────────────────────────
const STORAGE_KEYS = {
  PROFILE: '@sprintflow/profile',
  CHECKINS: '@sprintflow/checkins',
  SESSIONS: '@sprintflow/sessions',
  NUTRITION: '@sprintflow/nutrition',
  GROUPS: '@sprintflow/groups',
  OBJECTIVES: '@sprintflow/objectives',
  RECORDS: '@sprintflow/records',
  SETTINGS: '@sprintflow/settings',
} as const;

// ──────────────────────────────────────────────
// PROFIL ATHLÈTE
// ──────────────────────────────────────────────

/**
 * Charge le profil athlète depuis le stockage local.
 * Retourne le profil sauvegardé, ou le profil par défaut si aucun n'existe.
 * 
 * Gestion de la migration :
 * Si de nouveaux champs sont ajoutés à AthleteProfile,
 * ils seront automatiquement remplis avec les valeurs par défaut
 * grâce au spread { ...DEFAULT_PROFILE, ...stored }.
 */
export async function loadProfile(): Promise<AthleteProfile> {
  try {
    // 1. Tenter de récupérer depuis Supabase si l'utilisateur est connecté
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionData.session.user.id)
        .single();
        
      if (!error && profileData) {
        // Mapping Supabase -> Local
        const supProfile: Partial<AthleteProfile> = {
          role: profileData.role || 'athlete',
          nom: profileData.lastName || '',
          prenom: profileData.firstName || '',
          mesDisciplines: profileData.mesDisciplines || (profileData.mainDiscipline ? [profileData.mainDiscipline] : []),
        };
        const finalProfile = { ...DEFAULT_PROFILE, ...supProfile };
        
        // Mettre à jour le cache local silencieusement
        AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(finalProfile)).catch(() => {});
        return finalProfile;
      }
    }

    // 2. Fallback Cache local
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw === null) {
      return { ...DEFAULT_PROFILE };
    }
    const stored = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...stored };
  } catch (error) {
    console.warn('[StorageService] Erreur lors du chargement du profil:', error);
    return { ...DEFAULT_PROFILE };
  }
}

/**
 * Sauvegarde le profil athlète dans le stockage local.
 * Retourne true si la sauvegarde a réussi, false sinon.
 */
export async function saveProfile(profile: AthleteProfile): Promise<boolean> {
  try {
    // 1. Sauvegarde Locale (Instantanée)
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    
    // 2. Synchro Supabase (Background)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return; // Ne pas synchroniser si non connecté
      
      supabase.from('profiles').upsert({
        id: user.id, // Vrai ID utilisateur
        firstName: profile.prenom,
        lastName: profile.nom,
        gender: profile.sexe,
        birthDate: profile.dateNaissance,
        heightCm: parseInt(profile.taille) || null,
        weightKg: null,
        mainDiscipline: profile.mesDisciplines.length > 0 ? profile.mesDisciplines[0] : null,
        level: profile.niveau
      }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync] Erreur Profile:', error.message);
      });
    });

    return true;
  } catch (error) {
    console.warn('[StorageService] Erreur lors de la sauvegarde du profil:', error);
    return false;
  }
}

/**
 * Supprime le profil athlète du stockage local.
 * Utilisé pour le debug ou la déconnexion.
 */
export async function clearProfile(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE);
  } catch (error) {
    console.warn('[StorageService] Erreur lors de la suppression du profil:', error);
  }
}

// ──────────────────────────────────────────────
// CHECK-INS QUOTIDIENS
// ──────────────────────────────────────────────

/**
 * Sauvegarde un nouveau check-in.
 * Ajoute le check-in au début de l'historique (le plus récent en premier).
 */
export async function saveCheckin(checkin: CheckinData): Promise<boolean> {
  try {
    const history = await loadCheckins();
    
    // Remplacer si un check-in avec le même ID (même jour) existe déjà, sinon ajouter
    const existingIndex = history.findIndex(c => c.id === checkin.id);
    if (existingIndex >= 0) {
      history[existingIndex] = checkin;
    } else {
      history.unshift(checkin);
    }
    
    // Limiter l'historique aux 30 derniers jours pour éviter d'exploser le storage
    const limitedHistory = history.slice(0, 30);
    
    // 1. Sauvegarde Locale
    await AsyncStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(limitedHistory));
    
    // 2. Synchro Supabase (Background)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      supabase.from('checkins').upsert({
        id: checkin.id,
        user_id: user.id, // Vrai ID utilisateur
        date: checkin.date,
        sleepHours: checkin.sleepHours,
        sleepQuality: checkin.sleepQuality,
        wakeupFeeling: checkin.wakeupFeeling,
        motivation: checkin.motivation,
        fatigue: checkin.fatigue,
        hasPain: checkin.hasPain,
        painDetails: checkin.painDetails,
        score: checkin.score
      }).then(({ error }) => {
        if (error) console.warn('[Supabase Sync] Erreur Check-in:', error.message);
      });
    });

    return true;
  } catch (error) {
    console.warn('[StorageService] Erreur lors de la sauvegarde du check-in:', error);
    return false;
  }
}

/**
 * Charge l'historique des check-ins.
 */
export async function loadCheckins(): Promise<CheckinData[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CHECKINS);
    if (raw === null) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[StorageService] Erreur lors du chargement des check-ins:', error);
    return [];
  }
}

// ──────────────────────────────────────────────
// UTILITAIRES GÉNÉRIQUES (pour les futurs domaines)
// ──────────────────────────────────────────────

/**
 * Charge une valeur JSON depuis une clé de stockage.
 * Fonction utilitaire générique pour les futurs domaines.
 */
export async function loadData<T>(key: keyof typeof STORAGE_KEYS, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS[key]);
    if (raw === null) {
      return defaultValue;
    }
    return { ...defaultValue, ...JSON.parse(raw) };
  } catch (error) {
    console.warn(`[StorageService] Erreur lors du chargement de ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Sauvegarde une valeur JSON dans une clé de stockage.
 * Fonction utilitaire générique pour les futurs domaines.
 */
export async function saveData<T>(key: keyof typeof STORAGE_KEYS, data: T): Promise<boolean> {
  try {
    const json = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEYS[key], json);
    return true;
  } catch (error) {
    console.warn(`[StorageService] Erreur lors de la sauvegarde de ${key}:`, error);
    return false;
  }
}

/**
 * Supprime toutes les données SprintFlow.
 * Utilisé pour la déconnexion ou le reset complet.
 */
export async function clearAllData(): Promise<void> {
  try {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.warn('[StorageService] Erreur lors de la suppression totale:', error);
  }
}
