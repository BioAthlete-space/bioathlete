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

  // --- QUALITÉ DU SOMMEIL ---
  if (data.sleepQuality) {
    switch (data.sleepQuality) {
      case 'Très mauvais':
        score -= 15;
        summary.push('Qualité de sommeil très mauvaise');
        break;
      case 'Mauvais':
        score -= 10;
        break;
      case 'Moyen':
        score -= 5;
        break;
      case 'Bon':
        score += 0;
        break;
      case 'Excellent':
        score += 3;
        summary.push('Excellente qualité de sommeil');
        break;
    }
  }

  // --- RÉVEIL ---
  if (data.wakeupFeeling) {
    switch (data.wakeupFeeling) {
      case 'Épuisé':
        score -= 15;
        summary.push('Réveil épuisé');
        break;
      case 'Fatigué':
        score -= 8;
        break;
      case 'Moyen':
        score -= 3;
        break;
      case 'Bien':
        score += 0;
        break;
      case 'Très bien':
        score += 3;
        summary.push('Très bonne sensation au réveil');
        break;
    }
  }

  // --- MOTIVATION ---
  if (data.motivation !== undefined) {
    if (data.motivation <= 3) {
      score -= 10;
      summary.push('Motivation très basse');
    } else if (data.motivation <= 6) {
      score -= 5;
    } else if (data.motivation <= 8) {
      score -= 0;
    } else {
      score += 3;
      summary.push('Forte motivation aujourd\'hui');
    }
  }

  // --- FATIGUE ---
  if (data.fatigue !== undefined) {
    score -= data.fatigue * 1.5;
    if (data.fatigue >= 7) {
      summary.push('Niveau de fatigue général élevé');
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
