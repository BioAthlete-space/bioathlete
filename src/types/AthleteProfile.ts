/**
 * AthleteProfile - Type central du profil athlète.
 * 
 * Ce type est l'unique source de vérité pour la structure des données
 * du profil. Il est utilisé par :
 * - StorageService (sérialisation/désérialisation)
 * - useAthleteProfile (état React)
 * - account.tsx (affichage)
 * 
 * Pour ajouter un champ au profil, il suffit de :
 * 1. Ajouter la propriété ici
 * 2. Ajouter la valeur par défaut dans DEFAULT_PROFILE
 * Le reste (stockage, chargement, affichage) suivra automatiquement.
 */

export interface AthleteProfile {
  // Rôle
  role?: 'athlete' | 'coach';

  // Identité
  nom: string;
  prenom: string;
  email: string;
  dateNaissance: string;
  sexe: string;
  nationalite: string;

  // Sportif
  club: string;
  niveau: string;
  niveauFfa: string;
  mesDisciplines: string[];

  // Physique
  taille: string;

  // Préférences
  langue: string;
}

/**
 * Profil par défaut pour un nouvel utilisateur.
 * Aucune donnée pré-remplie = l'utilisateur part de zéro.
 */
export const DEFAULT_PROFILE: AthleteProfile = {
  role: 'athlete',
  nom: '',
  prenom: '',
  email: '',
  dateNaissance: '',
  sexe: '',
  nationalite: '',
  club: '',
  niveau: '',
  niveauFfa: '',
  mesDisciplines: [],
  taille: '',
  langue: 'Français',
};
