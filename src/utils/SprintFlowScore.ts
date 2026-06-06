import { CheckinData, PainDetail } from '../types/Checkin';

export interface ScoreResult {
  score: number;
  statusText: string;
  color: string;
  summary: string[];
}

export function calculateSprintFlowScore(data: Partial<CheckinData>): ScoreResult {
  let score = 100;
  const summary: string[] = [];

  // --- SOMMEIL ---
  if (data.sleepHours !== undefined) {
    if (data.sleepHours < 5) {
      score -= 25;
      summary.push('Dette de sommeil sévère (<5h)');
    } else if (data.sleepHours < 6) {
      score -= 15;
      summary.push('Sommeil insuffisant (<6h)');
    } else if (data.sleepHours < 7) {
      score -= 8;
      summary.push('Sommeil un peu court');
    } else if (data.sleepHours <= 9) {
      score -= 0;
      summary.push('Durée de sommeil optimale');
    } else {
      score -= 3;
      summary.push('Sommeil très long (>9h)');
    }
  }



  // --- MENSTRUAL CYCLE ---
  if (data.menstrualCycle) {
    if (data.menstrualCycle !== 'Aucune') {
      summary.push(`Cycle menstruel : ${data.menstrualCycle}`);
    }
    if (data.menstrualCycle === 'Pendant' || data.menstrualCycle === 'Début de cycle') {
      score -= 5; // Légère pondération pour alerter le coach
    }
  }

  // --- ÉNERGIE / FATIGUE ---
  if (data.fatigue !== undefined) {
    // 0 = Épuisé, 10 = Pleine forme
    const fatigueMalus = (10 - data.fatigue) * 1.5;
    score -= fatigueMalus;
    if (data.fatigue <= 3) {
      summary.push('Niveau d\'énergie très faible');
    }
  }

  // --- DOULEURS ---
  if (data.hasPain && data.painDetails && data.painDetails.length > 0) {
    let painMalus = 0;
    const painfulZones: string[] = [];
    const severePains: string[] = [];

    data.painDetails.forEach(pain => {
      let multiplier = 1;
      if (pain.type === 'Douleur articulaire') {
        multiplier = 2;
        severePains.push(pain.zone);
      } else if (pain.type === 'Blessure connue') {
        multiplier = 3;
        severePains.push(pain.zone);
      }
      
      painMalus += pain.intensity * multiplier;
      painfulZones.push(pain.zone);
    });

    score -= painMalus;

    if (severePains.length > 0) {
      summary.push(`Alerte : problème(s) sur ${severePains.join(', ')}`);
    } else if (painfulZones.length > 0) {
      summary.push(`Douleur(s) signalée(s) : ${painfulZones.join(', ')}`);
    }
  } else if (data.hasPain === false) {
    summary.push('Aucune douleur signalée');
  }

  // CLAMP 0 - 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // DETERMINATION DU STATUT
  let statusText = '';
  let color = '';

  if (score >= 90) {
    statusText = 'État optimal';
    color = '#4CAF50'; // Vert foncé/vif
  } else if (score >= 75) {
    statusText = 'Bon état';
    color = '#8BC34A'; // Vert clair
  } else if (score >= 60) {
    statusText = 'État moyen';
    color = '#FF9800'; // Orange
  } else if (score >= 40) {
    statusText = 'Fatigue importante';
    color = '#F57C00'; // Orange foncé
  } else {
    statusText = 'Risque élevé';
    color = '#F44336'; // Rouge
  }

  // Ne garder que les 4 résumés les plus pertinents
  const finalSummary = summary.slice(0, 4);

  return {
    score,
    statusText,
    color,
    summary: finalSummary
  };
}
