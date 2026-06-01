export type SleepQuality = 'Très mauvais' | 'Mauvais' | 'Moyen' | 'Bon' | 'Excellent';
export type WakeupFeeling = 'Épuisé' | 'Fatigué' | 'Moyen' | 'Bien' | 'Très bien';
export type PainType = 'Courbatures' | 'Raideur' | 'Gêne' | 'Douleur articulaire' | 'Douleur musculaire' | 'Blessure connue';

export interface PainDetail {
  zone: string;
  intensity: number; // 1-10
  type: PainType;
}

export interface CheckinData {
  id: string; // timestamp or uuid
  date: string; // ISO string
  
  sleepHours: number; // 0-12
  sleepQuality: SleepQuality;
  wakeupFeeling: WakeupFeeling;
  
  motivation: number; // 0-10
  fatigue: number; // 0-10
  
  hasPain: boolean;
  painDetails: PainDetail[];
  
  // Computed
  score: number;
}
