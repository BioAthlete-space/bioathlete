/**
 * useAthleteProfile - Hook React pour le profil athlète persisté.
 * 
 * COMPORTEMENT :
 * 1. Au mount → charge le profil depuis StorageService
 * 2. À chaque updateField() → met à jour le state + programme un auto-save (debounce 800ms)
 * 3. saveNow() → force une sauvegarde immédiate (pour le bouton "Enregistrer")
 * 4. Au unmount → sauvegarde les modifications en attente
 * 
 * ÉTATS EXPOSÉS :
 * - profile       : les données du profil
 * - isLoading     : true pendant le chargement initial
 * - isSaving      : true pendant une écriture disque
 * - isSaved       : true quand la dernière sauvegarde a réussi (reset après 2s)
 * - error         : message d'erreur si la sauvegarde échoue
 * - hasChanges    : true s'il y a des modifications non sauvegardées
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';

const PROFILE_UPDATED_EVENT = 'profile_updated';
import { AthleteProfile, DEFAULT_PROFILE } from '../types/AthleteProfile';
import { loadProfile, saveProfile } from '../services/StorageService';

const DEBOUNCE_DELAY = 800; // ms

interface UseAthleteProfileReturn {
  profile: AthleteProfile;
  updateField: (key: keyof AthleteProfile, value: any) => void;
  saveNow: () => Promise<boolean>;
  isLoading: boolean;
  isSaving: boolean;
  isSaved: boolean;
  error: string | null;
  hasChanges: boolean;
}

export function useAthleteProfile(): UseAthleteProfileReturn {
  const [profile, setProfile] = useState<AthleteProfile>({ ...DEFAULT_PROFILE });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Refs pour le debounce et le cleanup
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProfileRef = useRef<AthleteProfile>(profile);
  const hasLoadedRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchroniser la ref avec le state
  useEffect(() => {
    latestProfileRef.current = profile;
  }, [profile]);

  // ── CHARGEMENT INITIAL ──
  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const stored = await Promise.race([
          loadProfile(),
          // Timeout de sécurité : si AsyncStorage ne répond pas en 3s, on utilise les valeurs par défaut
          new Promise<AthleteProfile>((resolve) => 
            setTimeout(() => resolve({ ...DEFAULT_PROFILE }), 3000)
          ),
        ]);
        if (isMounted) {
          setProfile(stored);
          latestProfileRef.current = stored;
          hasLoadedRef.current = true;
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('[useAthleteProfile] Erreur de chargement:', e);
        if (isMounted) {
          // Fallback : démarrer avec les valeurs par défaut
          setProfile({ ...DEFAULT_PROFILE });
          hasLoadedRef.current = true;
          setError('Impossible de charger le profil');
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  // ── SAUVEGARDE INTERNE ──
  const performSave = useCallback(async (data: AthleteProfile): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    const success = await saveProfile(data);

    setIsSaving(false);

    if (success) {
      setIsSaved(true);
      setHasChanges(false);

      // Reset l'indicateur "sauvegardé" après 2 secondes
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } else {
      setError('Erreur lors de la sauvegarde');
    }

    return success;
  }, []);

  // ── AUTO-SAVE DEBOUNCED ──
  const scheduleSave = useCallback((data: AthleteProfile) => {
    // Annuler le timer précédent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave(data);
    }, DEBOUNCE_DELAY);
  }, [performSave]);

  // ── UPDATE FIELD ──
  // Global Sync
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(PROFILE_UPDATED_EVENT, (newP) => {
      setProfile(newP);
      latestProfileRef.current = newP;
    });
    return () => sub.remove();
  }, []);

  const updateField = useCallback((key: keyof AthleteProfile, value: any) => {
    // Ne pas sauvegarder tant que le chargement initial n'est pas terminé
    if (!hasLoadedRef.current) return;

    setProfile(prev => {
      const updated = { ...prev, [key]: value };
      setHasChanges(true);
      scheduleSave(updated);
      return updated;
    });
  }, [scheduleSave]);

  // ── SAVE NOW (bouton "Enregistrer") ──
  const saveNow = useCallback(async (): Promise<boolean> => {
    // Annuler le debounce en cours
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    return performSave(latestProfileRef.current);
  }, [performSave]);

  // ── CLEANUP AU UNMOUNT ──
  useEffect(() => {
    return () => {
      // Sauvegarder les modifications en attente avant de quitter
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        // Sauvegarde synchrone best-effort au unmount
        saveProfile(latestProfileRef.current).catch(() => {});
      }
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  return {
    profile,
    updateField,
    saveNow,
    isLoading,
    isSaving,
    isSaved,
    error,
    hasChanges,
  };
}

