export interface WeatherData {
  time: string;
  temperature_2m: number;
  apparent_temperature: number;
  precipitation_probability: number;
  weathercode: number;
  windspeed_10m: number;
  uv_index: number;
  aqi: number;
}

export interface DailyWeather {
  date: string;
  temperature_max: number;
  temperature_min: number;
  weathercode: number;
  uv_index_max: number;
  windspeed_max: number;
  aqi_max: number; // Simulated or fetched if daily AQI is available
}

export interface TrainingAdvice {
  clothing: string[];
  hydration: string[];
  warnings: string[];
}

export const WMO_CODES: Record<number, { label: string, icon: string }> = {
  0: { label: 'Ciel dégagé', icon: '☀️' },
  1: { label: 'Principalement clair', icon: '🌤' },
  2: { label: 'Partiellement nuageux', icon: '⛅' },
  3: { label: 'Couvert', icon: '☁️' },
  45: { label: 'Brouillard', icon: '🌫' },
  48: { label: 'Brouillard givrant', icon: '🌫' },
  51: { label: 'Bruine légère', icon: '🌦' },
  53: { label: 'Bruine modérée', icon: '🌧' },
  55: { label: 'Bruine dense', icon: '🌧' },
  56: { label: 'Bruine verglaçante légère', icon: '🌧❄️' },
  57: { label: 'Bruine verglaçante dense', icon: '🌧❄️' },
  61: { label: 'Pluie faible', icon: '🌦' },
  63: { label: 'Pluie modérée', icon: '🌧' },
  65: { label: 'Pluie forte', icon: '🌧' },
  66: { label: 'Pluie verglaçante faible', icon: '🌧❄️' },
  67: { label: 'Pluie verglaçante forte', icon: '🌧❄️' },
  71: { label: 'Chute de neige faible', icon: '🌨' },
  73: { label: 'Chute de neige modérée', icon: '❄️' },
  75: { label: 'Chute de neige forte', icon: '❄️' },
  77: { label: 'Grains de neige', icon: '❄️' },
  80: { label: 'Averses légères', icon: '🌦' },
  81: { label: 'Averses modérées', icon: '🌧' },
  82: { label: 'Averses violentes', icon: '⛈' },
  85: { label: 'Averses de neige légères', icon: '🌨' },
  86: { label: 'Averses de neige fortes', icon: '❄️' },
  95: { label: 'Orage', icon: '🌩' },
  96: { label: 'Orage avec grêle légère', icon: '⛈' },
  99: { label: 'Orage avec grêle forte', icon: '⛈' },
};

export const fetchWeather = async (lat: number, lon: number) => {
  try {
    // Appel Météo principale
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m&hourly=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,uv_index_max,windspeed_10m_max&timezone=auto`
    );
    const weatherData = await weatherRes.json();

    // Appel Qualité de l'air
    const aqiRes = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi&hourly=european_aqi&timezone=auto`
    );
    const aqiData = await aqiRes.json();

    return { weather: weatherData, airQuality: aqiData };
  } catch (error) {
    console.error("Erreur lors de la récupération de la météo", error);
    return null;
  }
};

export const searchLocation = async (query: string) => {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fr&format=json`);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("Erreur de recherche de localisation", error);
    return [];
  }
};

// L'Algorithme Déterministe Exhaustif
export const getTrainingAdvice = (
  temp: number, 
  apparentTemp: number, 
  weatherCode: number, 
  windSpeed: number, // km/h
  uvIndex: number, 
  aqi: number
): TrainingAdvice => {
  const advice: TrainingAdvice = {
    clothing: [],
    hydration: [],
    warnings: []
  };

  // --- 1. TEMPERATURE (On se base sur la température ressentie pour les conseils) ---
  const t = apparentTemp;
  if (t > 35) {
    advice.clothing.push("Tenue ultra-légère et respirante (débardeur, short court).");
    advice.clothing.push("Casquette blanche ou visière fortement recommandée.");
    advice.hydration.push("Boire > 800ml par heure d'effort.");
    advice.hydration.push("Ajouter impérativement des électrolytes ou du sel.");
    advice.warnings.push("DANGER EXTRÊME : Risque majeur de coup de chaleur. Privilégiez l'entraînement tôt le matin ou annulez.");
  } else if (t > 28) {
    advice.clothing.push("T-shirt technique respirant ou débardeur, short.");
    advice.clothing.push("Casquette recommandée.");
    advice.hydration.push("Boire environ 600-800ml par heure.");
    advice.hydration.push("Considérer l'ajout d'électrolytes.");
    advice.warnings.push("Forte chaleur : Modérez l'intensité de l'échauffement et cherchez l'ombre pour la récupération.");
  } else if (t > 20) {
    advice.clothing.push("Tenue courte classique (T-shirt, short).");
    advice.hydration.push("Boire 500ml par heure.");
  } else if (t > 12) {
    advice.clothing.push("T-shirt manches courtes, short ou cuissard léger.");
    advice.hydration.push("Boire régulièrement de petites gorgées (400-500ml/h).");
  } else if (t > 5) {
    advice.clothing.push("T-shirt manches longues ou coupe-vent léger, collant ou pantalon de survêtement.");
    advice.clothing.push("Des gants légers peuvent être utiles au début de l'échauffement.");
    advice.hydration.push("L'air frais masque la soif : n'oubliez pas de boire 400ml/h.");
    advice.warnings.push("Échauffement prolongé recommandé pour bien vasculariser les muscles.");
  } else if (t > -5) {
    advice.clothing.push("Système 3 couches en haut : T-shirt thermique près du corps + isolant + coupe-vent.");
    advice.clothing.push("Collant thermique, gants, et bonnet ou bandeau cache-oreilles indispensables.");
    advice.hydration.push("Boisson à température ambiante ou légèrement tiède (isotherme).");
    advice.warnings.push("Froid vif : Temps d'échauffement doublé. Ne restez pas statique à la fin de la séance pour éviter l'hypothermie.");
  } else {
    advice.clothing.push("Protection extrême : Cagoule/tour de cou, bonnet épais, gants d'hiver, veste coupe-vent/thermique, collant doublé polaire.");
    advice.clothing.push("Chaussettes thermiques.");
    advice.hydration.push("Gourde isotherme obligatoire pour éviter que l'eau ne gèle.");
    advice.warnings.push("FROID EXTRÊME : Risque d'engelures. Respirez si possible par le nez ou à travers un tissu (tour de cou) pour protéger les bronches. Si le vent est fort, envisagez le tapis de course.");
  }

  // --- 2. PRECIPITATIONS & CONDITIONS (Weather Codes) ---
  if ([45, 48].includes(weatherCode)) {
    advice.warnings.push("Brouillard : Visibilité réduite. Portez des vêtements fluo ou des éléments réfléchissants.");
  } else if ([51, 53, 55, 61, 80].includes(weatherCode)) {
    advice.clothing.push("Veste déperlante fine (si température < 20°C).");
    advice.clothing.push("Casquette pour protéger les yeux des gouttes.");
  } else if ([63, 65, 81, 82].includes(weatherCode)) {
    advice.clothing.push("Veste imperméable respirante.");
    advice.clothing.push("Appliquer de la crème anti-frottements (la pluie augmente les irritations).");
    advice.warnings.push("Pluie soutenue : Attention aux appuis glissants sur piste ou bitume mouillé. Réduisez légèrement vos vitesses de sprint.");
  } else if ([56, 57, 66, 67].includes(weatherCode)) {
    advice.warnings.push("DANGER VERGLAS : Pluie verglaçante. Les appuis sont extrêmement dangereux. Recommandation : Séance en intérieur ou renforcement musculaire à la maison.");
  } else if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
    advice.clothing.push("Chaussures avec une bonne accroche (trail si extérieur).");
    advice.warnings.push("Neige : Travaillez la proprioception. Pistes de sprint inutilisables, privilégiez un travail de côtes ou du fartlek lent.");
  } else if ([95, 96, 99].includes(weatherCode)) {
    advice.warnings.push("DANGER DE MORT : Orage / Éclairs. ANNULATION ou décalage de la séance extérieure impératif. Ne vous abritez jamais sous un arbre isolé.");
  }

  // --- 3. VENT ---
  if (windSpeed > 75) {
    advice.warnings.push("DANGER VENT VIOLENT : Risque de chutes de branches/d'arbres. Séance en forêt strictement déconseillée.");
  } else if (windSpeed > 40) {
    advice.clothing.push("Coupe-vent ajusté (éviter l'effet parachute).");
    advice.warnings.push("Vent fort : Adaptez l'intensité à l'effort plutôt qu'au chrono pur (effort très dur face au vent).");
  }

  // --- 4. INDICE UV ---
  if (uvIndex >= 8 && t > 15) {
    advice.clothing.push("Lunettes de soleil de catégorie 3.");
    advice.warnings.push("UV Très Élevés : Application de crème solaire écran total (indice 50) obligatoire sur les zones exposées.");
  } else if (uvIndex >= 5) {
    advice.warnings.push("UV Modérés à Élevés : Crème solaire conseillée.");
  }

  // --- 5. QUALITE DE L'AIR (European AQI) ---
  // 0-50: Good, 51-100: Moderate, 101-150: Unhealthy for Sensitive, 151-200: Unhealthy, >200: Very Unhealthy
  if (aqi > 150) {
    advice.warnings.push("ALERTE POLLUTION : Qualité de l'air très mauvaise. Annulez ou déplacez votre séance d'intensité en intérieur.");
  } else if (aqi > 100) {
    advice.warnings.push("Qualité de l'air médiocre : Évitez les séances lactiques ou de VMA, privilégiez l'endurance fondamentale.");
  } else if (aqi > 70) {
    advice.warnings.push("Qualité de l'air moyenne : Échauffez-vous très progressivement, prudence si vous êtes asthmatique.");
  }

  // Fallbacks si aucune consigne de vêtements/hydratation
  if (advice.clothing.length === 0) advice.clothing.push("Tenue adaptée à la saison.");
  if (advice.hydration.length === 0) advice.hydration.push("Boire à soif avant et après l'entraînement.");
  if (advice.warnings.length === 0 && t > 5 && t < 28 && windSpeed < 30 && aqi < 70) {
    advice.warnings.push("Conditions excellentes ! C'est le moment idéal pour une séance de qualité.");
  }

  return advice;
};
