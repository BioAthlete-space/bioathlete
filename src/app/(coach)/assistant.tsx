import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Linking, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useThemeColor';
import { Header } from '../../components/Header';
import { MaterialIcons } from '@expo/vector-icons';
import { BioflowLogo } from '../../components/BioflowLogo';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, interpolateColor, Easing } from 'react-native-reanimated';
import { fetchAIContext } from './_aiContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { bioflowStore } from '../../stores/BioflowStore';
import * as DocumentPicker from 'expo-document-picker';

type Message = {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  sources?: { title: string; url: string; }[];
  proposedEvents?: any[];
  proposedPeriodization?: any;
  proposedExercise?: any;
  proposedTemplate?: any;
  isHidden?: boolean;
};

export default function AssistantScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [confirmedEventIds, setConfirmedEventIds] = useState<Record<string, 'confirmed' | 'rejected'>>({});
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>({});
  
  // Mmoire IA
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memoryText, setMemoryText] = useState('');
  const [loadingMemory, setLoadingMemory] = useState(false);

  const fetchMemory = async () => {
    if (!user) return;
    setLoadingMemory(true);
    const { data } = await supabase.from('coach_ai_memory').select('memory_text').eq('coach_id', user.id);
    if (data && data.length > 0) {
      setMemoryText(data.map(d => d.memory_text).join('\n\n'));
    } else {
      setMemoryText('');
    }
    setLoadingMemory(false);
  };

  const saveMemory = async () => {
    if (!user) return;
    setLoadingMemory(true);
    await supabase.from('coach_ai_memory').delete().eq('coach_id', user.id);
    if (memoryText.trim()) {
      await supabase.from('coach_ai_memory').insert({ coach_id: user.id, memory_text: memoryText.trim() });
    }
    setShowMemoryModal(false);
    setLoadingMemory(false);
  };

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from('coach_groups')
      .select('*')
      .eq('coach_id', user?.id)
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroup(data[0]);
      }
    }
  };

  // Parser helpers (copy from sessions/create.tsx for database compatibility)
  const parseTimeString = (str: any) => {
    if (str === null || str === undefined) return null;
    const s = String(str).trim().toLowerCase();
    if (s === 'max' || s === 'libre') return { type: s };
    const timeMatch = s.match(/^(\d+):(\d{1,2})$/);
    if (timeMatch) return { type: 'time', seconds: parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) };
    let seconds = 0;
    const hMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
    const minMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:min|m)(?!\w)/);
    const secMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:sec|s)/);
    if (hMatch) seconds += parseFloat(hMatch[1]) * 3600;
    if (minMatch) seconds += parseFloat(minMatch[1]) * 60;
    if (secMatch) seconds += parseFloat(secMatch[1]);
    if (seconds > 0) return { type: 'time', seconds };
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'number', value: num };
    return { type: 'raw', text: str };
  };

  const parseWeightString = (str: any) => {
    if (str === null || str === undefined) return null;
    const s = String(str).trim().toLowerCase();
    if (s === 'pdc') return { type: 'bodyweight' };
    const unitMatch = s.match(/(\d+(?:\.\d+)?)\s*(kg|% max)/i);
    if (unitMatch) return { type: 'weight', value: parseFloat(unitMatch[1]), unit: unitMatch[2].toLowerCase() === 'kg' ? 'kg' : '% max' };
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'weight', value: num, unit: 'kg' };
    return { type: 'raw', text: str };
  };

  const parseRepsString = (str: any) => {
    if (str === null || str === undefined) return null;
    const s = String(str).trim().toLowerCase();
    if (s === 'max' || s === 'échec' || s === 'echec') return { type: 'max' };
    const rangeMatch = s.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) return { type: 'range', min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
    const num = parseInt(s);
    if (!isNaN(num)) return { type: 'exact', count: num };
    return { type: 'raw', text: str };
  };

  const parseDistanceString = (str: any) => {
    if (str === null || str === undefined) return null;
    const s = String(str).trim().toLowerCase();
    const unitMatch = s.match(/(\d+(?:\.\d+)?)\s*(km|m)/i);
    if (unitMatch) {
       let val = parseFloat(unitMatch[1]);
       if (unitMatch[2].toLowerCase() === 'km') val *= 1000;
       return { type: 'distance', meters: val };
    }
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'distance', meters: num }; 
    return { type: 'raw', text: str };
  };

  const parseIntensityString = (str: any) => {
    if (str === null || str === undefined) return null;
    const s = String(str).trim().toLowerCase();
    const rpeMatch = s.match(/(\d+(?:\.\d+)?)\s*rpe|rpe\s*(\d+(?:\.\d+)?)/i);
    if (rpeMatch) return { type: 'intensity', value: parseFloat(rpeMatch[1] || rpeMatch[2]), unit: 'rpe' };
    const unitMatch = s.match(/(\d+(?:\.\d+)?)\s*(% vma|% pma|%|allure)/i);
    if (unitMatch) return { type: 'intensity', value: parseFloat(unitMatch[1]), unit: unitMatch[2].toLowerCase() };
    const num = parseFloat(s);
    if (!isNaN(num)) return { type: 'intensity', value: num, unit: '%' };
    return { type: 'raw', text: str };
  };

  const parseDateString = (dateStr: any) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) {
      const d = parts[1].padStart(2, '0');
      const m = parts[2].padStart(2, '0');
      return `${parts[3]}-${m}-${d}`;
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  };

  const handleUploadPDF = async (messageId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      
      const file = result.assets[0];
      
      Alert.alert("Envoi en cours", "Le PDF est en cours de téléchargement...");
      
      const response = await fetch(file.uri);
      const blob = await response.blob();
      
      const fileName = `competitions/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      
      const { data, error } = await supabase.storage.from('media').upload(fileName, blob, {
        contentType: 'application/pdf'
      });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      
      setSelectedLinks(prev => ({ ...prev, [messageId]: publicUrl }));
      Alert.alert("Succès", "Le PDF a été importé avec succès. Il sera attaché à la compétition lors de la confirmation.");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur", "Impossible d'importer le fichier : " + e.message);
    }
  };

  const handleConfirmEvent = async (messageId: string, eventIndex: number, event: any) => {
    if (!selectedGroup) {
      Alert.alert("Erreur", "Veuillez sélectionner un groupe d'entraînement d'abord.");
      return;
    }
    const eventId = `${messageId}_${eventIndex}`;
    
    try {
      // Préparer les exercices s'il y en a
      const items = (event.items || []).map((item: any) => {
        const id = Math.random().toString();
        const p = { id, ...item };
        if (p.duration) p.parsed_duration = parseTimeString(p.duration);
        if (p.rest) p.parsed_rest = parseTimeString(p.rest);
        if (p.charge) p.parsed_charge = parseWeightString(p.charge);
        if (p.reps) p.parsed_reps = parseRepsString(p.reps);
        if (p.sets) p.parsed_sets = parseRepsString(p.sets);
        if (p.distance) p.parsed_distance = parseDistanceString(p.distance);
        if (p.intensity) p.parsed_intensity = parseIntensityString(p.intensity);
        return p;
      });

      // Insérer dans la table workouts
      const payload: any = {
        coach_id: user?.id,
        group_id: selectedGroup.id,
        date: parseDateString(event.date),
        title: event.title,
        type: event.type,
        description: event.description || '',
        location: event.location || null,
        link_url: selectedLinks[eventId] || (event.link_urls && event.link_urls.length > 0 ? event.link_urls[0].url : event.link_url) || null,
        competition_type: event.competition_type || null,
        content: { items },
        duration_minutes: event.duration_minutes || 0,
        status: 'planned'
      };

      if (event.subgroup_id) {
        payload.subgroup_id = event.subgroup_id;
      }

      // Si c'est un jour de repos, on supprime d'abord toutes les autres séances prévues ce jour-là
      if (event.type === 'Repos') {
        await supabase
          .from('workouts')
          .delete()
          .eq('group_id', selectedGroup.id)
          .eq('date', payload.date);
      }

      const { error } = await supabase.from('workouts').insert(payload);
      
      if (error) {
        throw error;
      }

      setConfirmedEventIds(prev => ({ ...prev, [eventId]: 'confirmed' }));
      
      // Notification visuelle
      bioflowStore.trigger('success');
      
      // Envoyer un message système pour informer l'IA du succès
      const systemConfirmText = `[Système : L'entraîneur a confirmé et planifié la proposition suivante dans le groupe "${selectedGroup.name}" pour le ${event.date} : "${event.title}" (${event.type})]`;
      await sendMessage(systemConfirmText, true);
      
    } catch (e: any) {
      console.error("Erreur d'insertion DB:", e);
      Alert.alert("Erreur lors de la planification", e.message);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Erreur d'enregistrement : ${e.message}. Vérifiez le format des données.`
      }]);
      bioflowStore.trigger('error');
    }
  };

  const handleRejectEvent = async (messageId: string, eventIndex: number, event: any) => {
    const eventId = `${messageId}_${eventIndex}`;
    setConfirmedEventIds(prev => ({ ...prev, [eventId]: 'rejected' }));
    
    // Envoyer un message système pour informer l'IA du refus
    const systemRejectText = `[Système : L'entraîneur a refusé la proposition de planification pour la séance "${event.title}" (${event.type}) le ${event.date}. Adapte et affine les détails en lui posant des questions.]`;
    await sendMessage(systemRejectText, true);
  };

  const handleConfirmPeriodization = async (messageId: string, peri: any) => {
    if (!selectedGroup) return Alert.alert("Erreur", "Sélectionnez un groupe.");
    try {
      const { error } = await supabase.from('coach_periodizations').insert({
        coach_id: user?.id,
        group_id: selectedGroup.id,
        name: peri.name,
        color: peri.color || '#3B82F6',
        start_date: parseDateString(peri.start_date),
        end_date: parseDateString(peri.end_date)
      });
      if (error) throw error;
      setConfirmedEventIds(prev => ({ ...prev, [messageId]: 'confirmed' }));
      bioflowStore.trigger('success');
      await sendMessage(`[Système : L'entraîneur a validé la création du cycle "${peri.name}"]`, true);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  };

  const handleRejectPeriodization = async (messageId: string, peri: any) => {
    setConfirmedEventIds(prev => ({ ...prev, [messageId]: 'rejected' }));
    await sendMessage(`[Système : L'entraîneur a refusé la création du cycle "${peri.name}". Pose-lui des questions pour ajuster les dates ou le nom.]`, true);
  };

  const handleConfirmExercise = async (messageId: string, ex: any) => {
    try {
      const { error } = await supabase.from('exercises').insert({
        coach_id: user?.id,
        is_official: false,
        name: ex.name,
        category: ex.category || 'Général',
        description: ex.description || 'Description générée par IA',
        instructions: ex.instructions || 'Consignes à définir',
        primary_muscle: ex.primary_muscle || 'Corps entier'
      });
      if (error) throw error;
      setConfirmedEventIds(prev => ({ ...prev, [messageId]: 'confirmed' }));
      bioflowStore.trigger('success');
      await sendMessage(`[Système : L'entraîneur a validé l'ajout de l'exercice "${ex.name}" à la bibliothèque]`, true);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  };

  const handleRejectExercise = async (messageId: string, ex: any) => {
    setConfirmedEventIds(prev => ({ ...prev, [messageId]: 'rejected' }));
    await sendMessage(`[Système : L'entraîneur a refusé l'ajout de l'exercice "${ex.name}". Demande-lui s'il souhaite modifier le nom ou la catégorie.]`, true);
  };

  const handleConfirmTemplate = async (messageId: string, tpl: any) => {
    try {
      const { error } = await supabase.from('workout_templates').insert({
        coach_id: user?.id,
        name: tpl.name,
        type: tpl.type,
        content: tpl.content
      });
      if (error) throw error;
      setConfirmedEventIds(prev => ({ ...prev, [messageId]: 'confirmed' }));
      bioflowStore.trigger('success');
      await sendMessage(`[Système : L'entraîneur a validé l'ajout de la séance type "${tpl.name}" à la bibliothèque]`, true);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  };

  const handleRejectTemplate = async (messageId: string, tpl: any) => {
    setConfirmedEventIds(prev => ({ ...prev, [messageId]: 'rejected' }));
    await sendMessage(`[Système : L'entraîneur a refusé l'ajout de la séance type "${tpl.name}". Demande-lui comment ajuster le contenu.]`, true);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: "Bonjour coach ! Je suis Bioflow IA. Je suis là pour vous aider à analyser vos entraînements, trouver des idées de séances, ou planifier vos blocs. Comment puis-je vous aider aujourd'hui ?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Animation state
  const glowOpacity = useSharedValue(0.1);
  const glowColorProgress = useSharedValue(0);

  useEffect(() => {
    if (isThinking) {
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowColorProgress.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        true
      );
    } else {
      glowOpacity.value = withTiming(0.1, { duration: 500 });
      glowColorProgress.value = withTiming(0, { duration: 500 });
    }
  }, [isThinking]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = interpolateColor(
      glowColorProgress.value,
      [0, 0.33, 0.66, 1],
      [theme.primary, '#8B5CF6', '#EC4899', theme.primary]
    );

    return {
      borderColor: borderColor,
      shadowColor: borderColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowOpacity.value,
      shadowRadius: isThinking ? 15 : 5,
      borderWidth: isThinking ? 2 : 1,
    };
  });

  const sendMessage = async (textToSend?: string, isHidden: boolean = false) => {
    const rawText = textToSend || input.trim();
    if (!rawText || isThinking) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: rawText, isHidden };
    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setIsThinking(true);
    bioflowStore.trigger('thinking', 30000); // 30s timeout max for thinking animation

    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    if (!apiKey) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'system',
          content: "⚠️ La clé API Gemini n'est pas configurée. Veuillez ajouter EXPO_PUBLIC_GEMINI_API_KEY dans votre fichier .env pour activer Bioflow IA."
        }]);
        setIsThinking(false);
      }, 1000);
      return;
    }

    try {
      const aiContextData = await fetchAIContext(user?.id || '', selectedGroup?.id || null);

      // Préparer l'historique pour Gemini
      const geminiHistory = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      geminiHistory.push({
        role: 'user',
        parts: [{ text: userMessage.content }]
      });

      const activeGroupName = selectedGroup ? selectedGroup.name : "Aucun groupe actif";
      const currentDateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const systemPrompt = `Tu es Bioflow IA, le copilote d'entraînement expert intégré à l'application BioAthlete. Tu n'es pas un simple chatbot, tu es un assistant technique proactif qui aide l'entraîneur (coach) à prendre des décisions sportives. L'application est EXCLUSIVEMENT dédiée à l'athlétisme. Ignore complètement les autres sports.

CONTEXTE GLOBAL EN TEMPS RÉEL (Données de l'Application) :
- Date du jour : ${currentDateStr}
- Groupe actif : ${activeGroupName}
- Sous-groupes du groupe : ${JSON.stringify(aiContextData?.subgroups || [])}
- Athlètes : ${JSON.stringify(aiContextData?.athletes || [])}
- Historique récent & futur : ${JSON.stringify(aiContextData?.workouts || [])}
- Périodisation active : ${JSON.stringify(aiContextData?.periodizations || [])}
- Préférences et Habitudes du coach : ${aiContextData?.memory || "Aucune préférence mémorisée."}

RÈGLES D'ANALYSE ET DE SÉCURITÉ SPORTIVE (OBLIGATOIRE) :
1. **Cohérence et Surcharge** : Avant de proposer une séance, analyse scrupuleusement l'historique et le futur planifié. Si tu détectes une répétition excessive (ex: 3 séances lactiques dans la même semaine), un risque de surcharge, ou un manque de récupération, ALERTE le coach explicitement dans ta réponse avant de faire la proposition.
2. **Adéquation Athlètes** : Croise ta proposition avec les caractéristiques des athlètes du groupe.
3. **Tendances** : Utilise les records et progressions pour adapter les allures ou charges suggérées.

RÈGLES DES SOUS-GROUPES :
1. Si la liste "Sous-groupes du groupe" contient des sous-groupes avec des noms pertinents/descriptifs (ex: Sprinteurs, Lanceurs, Sprint long) et que tu dois proposer une séance, tu DOIS EXPLICITEMENT DEMANDER au coach si la séance est destinée à TOUT le groupe ou à un sous-groupe spécifique. (Ne demande pas si les noms sont vagues ou humoristiques sans rapport avec le sport).
2. Si le coach précise que la séance est pour un sous-groupe spécifique, génère la balise <propose_event> en ajoutant un champ facultatif "subgroup_id" correspondant à l'ID exact du sous-groupe.

RÈGLES POUR LES COMPÉTITIONS ET LA RECHERCHE WEB :
1. L'outil Google Search est INTÉGRÉ et AUTOMATIQUE. Ne dis JAMAIS "Je vais chercher", fais-le automatiquement.
2. **Zéro Hallucination** : N'invente JAMAIS une information, un horaire ou un lieu. Si les résultats Google sont flous ou contradictoires, tu DOIS poser une question de clarification au coach.
3. **Fiabilité des Liens** : Privilégie EN PREMIER les sites web ou les pages (réseaux sociaux, etc.) des CLUBS organisateurs (ils sont souvent plus fiables et à jour que la FFA). En second choix, utilise la FFA ou les ligues régionales. Pour les horaires, cherche de multiples sources et fournis un tableau "link_urls".
4. **Score de Confiance** : Évalue en interne la fiabilité des informations trouvées sur internet (0-100) dans le champ "confidence_score". Si le score est < 80, pose une question au lieu de planifier aveuglément. IMPORTANT : Si le coach donne une date sans préciser l'année, déduis AUTOMATIQUEMENT qu'il s'agit de la prochaine occurrence logique. Ne demande jamais en quelle année c'est ! Laisse simplement le champ "competition_type" vide sauf si mentionné.

RÈGLES D'AFFICHAGE SUR MOBILE :
L'application est utilisée sur smartphone. Tes réponses doivent être EXTRÊMEMENT concises.
- ÉVITE formellement les gros blocs de texte et l'abus de formatage Markdown.
- Résume l'information au strict minimum vital (1 ou 2 phrases courtes maximum).

MÉMORISATION DES PRÉFÉRENCES :
Si, lors de la conversation, tu déduis une habitude forte du coach (ex: "Je fais toujours ma VMA le mardi", "Je déteste la plyométrie"), tu DOIS inclure la balise XML <update_memory>Votre préférence ici</update_memory> à la fin de ta réponse (en texte brut). Le système la sauvegardera pour toujours.

ACTIONS POSSIBLES (blocs XML à inclure à la fin de ta réponse, en texte brut, PAS dans un bloc de code markdown) :

1. Planifier un événement (Séance, Compétition, Repos) :
<propose_event>
{
  "confidence_score": 95,
  "type": "Lactique", // 'Aérobie', 'Lactique', 'Musculation', 'Récupération', 'Mobilité', 'Plyométrie', 'Technique', 'Escalier', 'Libre', 'Compétition', 'Repos'
  "subgroup_id": "UUID_OPTIONNEL_DU_SOUS_GROUPE",
  "title": "Titre court",
  "date": "DD/MM/YYYY",
  "description": "Consignes globales intégrant tes alertes de contexte (NE PAS LISTER LES EXERCICES ICI)",
  "location": "Adresse complète du stade (si Compétition)",
  "competition_type": "Type d'épreuve (si Compétition)",
  "link_urls": [
    { "url": "https://...", "label": "Titre du lien (ex: Horaires PDF, Site Organisateur...)" }
  ],
  "link_url": "Lien internet (Rétrocompatibilité, optionnel)",
  "items": [ // DÉTAIL OBLIGATOIRE DE LA SÉANCE (N'écris JAMAIS "voir description")
    { "itemType": "title", "value": "Échauffement" },
    { "itemType": "effort", "exercise_name": "Footing", "duration": "15 min" },
    { "itemType": "title", "value": "Corps de séance" },
    { "itemType": "effort", "exercise_name": "Sprints courts", "sets": "4", "reps": "8", "rest": "2 min", "distance": "60m" }
  ]
}
</propose_event>

2. Créer une Périodisation (Cycle d'entraînement) :
<propose_periodization>
{
  "name": "Nom du cycle (ex: Force Max)",
  "color": "#3B82F6",
  "start_date": "DD/MM/YYYY",
  "end_date": "DD/MM/YYYY"
}
</propose_periodization>

3. Ajouter un exercice à la bibliothèque :
<propose_exercise>
{
  "name": "Nom de l'exercice (ex: Squat Bulgare)",
  "category": "Musculation",
  "description": "Description détaillée de l'exercice",
  "instructions": "Consignes de réalisation étape par étape",
  "primary_muscle": "Muscle principal ciblé (ex: Quadriceps)"
}
</propose_exercise>

4. Ajouter une séance type à la bibliothèque :
<propose_template>
{
  "name": "Nom de la séance type",
  "type": "Lactique",
  "content": { "items": [] }
}
</propose_template>

Important :
1. Si l'utilisateur te demande des informations nécessitant internet (meetings, etc.), fais une recherche ciblée sur le web et valide la pertinence.
2. Adopte un ton à la fois professionnel et chaleureux. Utilise quelques emojis de temps en temps pour rendre la conversation plus vivante (ex: 👋, 💪, 🚀, 🏃‍♂️).
3. Évite d'utiliser trop d'étoiles de formatage Markdown (**texte**) ou des listes à puces trop strictes qui peuvent rendre la réponse froide et robotique. Parle plus naturellement, comme un coach sportif qui discute avec un confrère.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiHistory,
          systemInstruction: {
            role: "system",
            parts: [{ text: systemPrompt }]
          },
          tools: [
            {
              googleSearch: {}
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          }
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        let msg = data.error.message;
        if (msg.includes('high demand') || msg.includes('503')) {
          msg = "L'intelligence artificielle est actuellement très sollicitée (pic de requêtes mondial). Veuillez patienter quelques secondes et réessayer.";
        }
        throw new Error(msg);
      }

      const aiRawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu formuler de réponse.";
      
      // Extraction et nettoyage des propositions
      let cleanText = aiRawText;
      let proposedEvents: any[] = [];
      let proposedPeriodization: any = null;
      let proposedExercise: any = null;
      let proposedTemplate: any = null;
      
      const eventRegex = /<propose_event>([\s\S]*?)<\/propose_event>/g;
      let eventMatch;
      while ((eventMatch = eventRegex.exec(cleanText)) !== null) {
        try { 
          let proposedEvent = JSON.parse(eventMatch[1].trim()); 
          // Validation des liens
          if (proposedEvent.link_urls && proposedEvent.link_urls.length > 0) {
            const validLinks = [];
            for (const link of proposedEvent.link_urls) {
              try {
                const res = await supabase.functions.invoke('verify-link', { body: { url: link.url } });
                if (res.data?.isAccessible) {
                  validLinks.push(link);
                }
              } catch(e) {
                console.error("Erreur de vérification du lien:", e);
              }
            }
            const originalLength = proposedEvent.link_urls.length;
            proposedEvent.link_urls = validLinks;
            
            if (originalLength > 0 && validLinks.length === 0) {
               cleanText += "\n\n⚠️ L'IA a trouvé des liens pour cet événement, mais ils ont été identifiés comme inaccessibles ou expirés après vérification automatique.";
            }
          }
          proposedEvents.push(proposedEvent);
        } catch (e) { console.error("Erreur parsing event JSON", e); }
      }
      cleanText = cleanText.replace(/<propose_event>[\s\S]*?<\/propose_event>/g, '').trim();

      const periMatch = cleanText.match(/<propose_periodization>([\s\S]*?)<\/propose_periodization>/);
      if (periMatch) {
        try { proposedPeriodization = JSON.parse(periMatch[1].trim()); } catch (e) { console.error("Erreur parsing periodization JSON", e); }
        cleanText = cleanText.replace(/<propose_periodization>[\s\S]*?<\/propose_periodization>/, '').trim();
      }

      const exMatch = cleanText.match(/<propose_exercise>([\s\S]*?)<\/propose_exercise>/);
      if (exMatch) {
        try { proposedExercise = JSON.parse(exMatch[1].trim()); } catch (e) { console.error("Erreur parsing exercise JSON", e); }
        cleanText = cleanText.replace(/<propose_exercise>[\s\S]*?<\/propose_exercise>/, '').trim();
      }

      const tempMatch = cleanText.match(/<propose_template>([\s\S]*?)<\/propose_template>/);
      if (tempMatch) {
        try { proposedTemplate = JSON.parse(tempMatch[1].trim()); } catch (e) { console.error("Erreur parsing template JSON", e); }
        cleanText = cleanText.replace(/<propose_template>[\s\S]*?<\/propose_template>/, '').trim();
      }

      // Extraction mémoire
      const memMatch = cleanText.match(/<update_memory>([\s\S]*?)<\/update_memory>/);
      if (memMatch) {
        const memoryValue = memMatch[1].trim();
        cleanText = cleanText.replace(/<update_memory>[\s\S]*?<\/update_memory>/, '').trim();
        // Insert into database
        supabase.from('coach_ai_memory').insert({
          coach_id: user?.id,
          memory_text: memoryValue
        }).then(({error}) => { if(error) console.error("Erreur sauvegarde mémoire:", error); });
      }

      // Extraction des sources de recherche Google
      const groundingChunks = data.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const uniqueSources: { title: string; url: string; }[] = [];
      const seenUrls = new Set<string>();
      
      for (const chunk of groundingChunks) {
        const url = chunk.web?.uri;
        const title = chunk.web?.title || url || "Source";
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          uniqueSources.push({ title, url });
        }
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        content: cleanText,
        proposedEvents: proposedEvents.length > 0 ? proposedEvents : undefined,
        proposedPeriodization,
        proposedExercise,
        proposedTemplate,
        sources: uniqueSources.length > 0 ? uniqueSources : undefined
      }]);
      bioflowStore.trigger('success', 3000);
    } catch (error: any) {
      bioflowStore.trigger('error', 3000);
      let errorMessage = error.message;
      if (errorMessage.toLowerCase().includes('failed to fetch') || errorMessage.toLowerCase().includes('network request failed')) {
        errorMessage = "Impossible de se connecter à l'intelligence artificielle. Veuillez vérifier votre connexion internet.";
      }
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: `Erreur: ${errorMessage}`
      }]);
    } finally {
      setIsThinking(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.isHidden) return null;

    const isUser = item.role === 'user';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={[styles.systemMessageText, { color: theme.error || '#EF4444' }]}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowModel]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
            <BioflowLogo size={20} />
          </View>
        )}
        <View style={[
          styles.messageBubble, 
          isUser ? [styles.messageBubbleUser, { backgroundColor: theme.primary }] : [styles.messageBubbleModel, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]
        ]}>
          <Text style={[styles.messageText, { color: isUser ? '#FFFFFF' : theme.text }]}>
            {item.content}
          </Text>
          
          {!isUser && item.proposedEvents && item.proposedEvents.map((event, idx) => {
            const eventId = `${item.id}_${idx}`;
            return (
            <View key={idx} style={[styles.proposalCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={styles.proposalHeader}>
                <View style={[
                  styles.typeBadge, 
                  { 
                    backgroundColor: event.type === 'Compétition' ? '#10B98120' : event.type === 'Repos' ? '#F59E0B20' : theme.primary + '20' 
                  }
                ]}>
                  <MaterialIcons 
                    name={
                      event.type === 'Compétition' ? 'emoji-events' : 
                      event.type === 'Repos' ? 'hotel' : 
                      event.type === 'Musculation' ? 'fitness-center' : 'directions-run'
                    } 
                    size={14} 
                    color={
                      event.type === 'Compétition' ? '#10B981' : 
                      event.type === 'Repos' ? '#F59E0B' : theme.primary
                    } 
                  />
                  <Text style={[
                    styles.typeBadgeText, 
                    { 
                      color: event.type === 'Compétition' ? '#10B981' : 
                             event.type === 'Repos' ? '#F59E0B' : theme.primary 
                    }
                  ]}>
                    {event.type}
                  </Text>
                </View>
                <Text style={[styles.proposalDate, { color: theme.icon }]}>
                  {event.date}
                </Text>
              </View>

              <Text style={[styles.proposalTitle, { color: theme.text }]}>
                {event.title}
              </Text>

              {event.description ? (
                <Text style={[styles.proposalDesc, { color: theme.icon }]}>
                  {event.description}
                </Text>
              ) : null}

              {event.location ? (
                <TouchableOpacity 
                  style={[styles.detailRow, { paddingVertical: 4 }]}
                  onPress={() => {
                    const mapUrl = Platform.select({
                      ios: `http://maps.apple.com/?q=${encodeURIComponent(event.location)}`,
                      android: `geo:0,0?q=${encodeURIComponent(event.location)}`,
                      default: `https://maps.google.com/?q=${encodeURIComponent(event.location)}`
                    });
                    if (mapUrl) Linking.openURL(mapUrl).catch(() => Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(event.location)}`));
                  }}
                >
                  <MaterialIcons name="place" size={14} color={theme.primary} />
                  <Text style={[styles.detailText, { color: theme.primary, textDecorationLine: 'underline' }]}>
                    Ouvrir l'itinéraire ({event.location})
                  </Text>
                </TouchableOpacity>
              ) : null}

              {event.link_urls && event.link_urls.length > 0 ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, color: theme.text, marginBottom: 4, fontWeight: 'bold' }}>Choisissez le lien officiel :</Text>
                  {event.link_urls.map((link: any, linkIdx: number) => {
                    const isSelected = selectedLinks[eventId] ? selectedLinks[eventId] === link.url : linkIdx === 0;
                    return (
                      <View key={linkIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <TouchableOpacity onPress={() => setSelectedLinks(prev => ({ ...prev, [eventId]: link.url }))} style={{ marginRight: 8, padding: 4 }}>
                          <MaterialIcons name={isSelected ? "radio-button-checked" : "radio-button-unchecked"} size={20} color={isSelected ? theme.primary : theme.icon} />
                        </TouchableOpacity>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => {
                          let url = link.url;
                          if (!url.startsWith('http')) url = 'https://' + url;
                          Linking.openURL(url).catch(console.error);
                        }}>
                          <Text style={{ color: theme.primary, textDecorationLine: 'underline', fontSize: 14 }}>{link.label}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ) : event.link_url ? (
                <TouchableOpacity 
                  style={[styles.detailRow, { paddingVertical: 4 }]} 
                  onPress={() => {
                    let url = event.link_url;
                    if (!url.startsWith('http')) url = 'https://' + url;
                    Linking.openURL(url).catch(console.error);
                  }}
                >
                  <MaterialIcons name="link" size={14} color={theme.primary} />
                  <Text style={[styles.detailText, { color: theme.primary, textDecorationLine: 'underline' }]}>
                    Lien officiel (Site Web / Horaires)
                  </Text>
                </TouchableOpacity>
              ) : event.type === 'Compétition' ? (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: theme.primary + '10', borderRadius: 8 }}>
                  <Text style={{ fontSize: 13, color: theme.text, marginBottom: 8, fontStyle: 'italic' }}>
                    ⚠️ Aucun lien officiel valide trouvé. Vous pouvez au choix :
                  </Text>
                  
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 8, backgroundColor: theme.primary, borderRadius: 6 }}
                    onPress={() => {
                      const query = encodeURIComponent((event.title || "") + " " + (event.location || "") + " horaires athlétisme");
                      Linking.openURL(`https://www.google.com/search?q=${query}`).catch(console.error);
                    }}
                  >
                    <MaterialIcons name="search" size={18} color="#fff" />
                    <Text style={{ color: "#fff", marginLeft: 6, fontWeight: 'bold' }}>Rechercher sur Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 8, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 6 }}
                    onPress={() => handleUploadPDF(eventId)}
                  >
                    <MaterialIcons name="picture-as-pdf" size={18} color={theme.primary} />
                    <Text style={{ color: theme.text, marginLeft: 6 }}>Importer un PDF officiel</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={{ 
                      backgroundColor: theme.card, 
                      borderColor: theme.border, 
                      borderWidth: 1, 
                      borderRadius: 6, 
                      padding: 8, 
                      color: theme.text,
                      fontSize: 13
                    }}
                    placeholder="Ou collez un lien URL ici..."
                    placeholderTextColor={theme.icon}
                    value={selectedLinks[eventId] || ''}
                    onChangeText={(text) => setSelectedLinks(prev => ({ ...prev, [eventId]: text }))}
                  />
                </View>
              ) : null}

              {event.items && event.items.length > 0 && (
                <View style={styles.exerciseList}>
                  {event.items.map((ex: any, exIdx: number) => (
                    <View key={exIdx} style={[styles.exerciseRow, { borderBottomColor: theme.border, borderBottomWidth: exIdx === event.items.length - 1 ? 0 : 0.5 }]}>
                      {ex.itemType === 'title' ? (
                        <Text style={[styles.exTitleText, { color: theme.text }]}>{ex.value}</Text>
                      ) : ex.itemType === 'note' ? (
                        <Text style={[styles.exNoteText, { color: theme.icon }]}>{ex.value}</Text>
                      ) : (
                        <View>
                          <Text style={[styles.exNameText, { color: theme.text }]}>{ex.exercise_name}</Text>
                          <Text style={[styles.exDetailsText, { color: theme.icon }]}>
                            {[
                              ex.sets ? `${ex.sets} séries` : null,
                              ex.reps ? `${ex.reps} reps` : null,
                              ex.duration ? `durée: ${ex.duration}` : null,
                              ex.distance ? `dist: ${ex.distance}` : null,
                              ex.charge ? `charge: ${ex.charge}` : null,
                              ex.rest ? `récup: ${ex.rest}` : null
                            ].filter(Boolean).join(' • ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Statut de confirmation ou boutons */}
              <View style={styles.confirmSection}>
                {confirmedEventIds[eventId] === 'confirmed' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                    <MaterialIcons name="check-circle" size={18} color="#10B981" />
                    <Text style={[styles.statusText, { color: '#10B981' }]}>Planifié avec succès ! ✓</Text>
                  </View>
                ) : confirmedEventIds[eventId] === 'rejected' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#EF444420' }]}>
                    <MaterialIcons name="cancel" size={18} color="#EF4444" />
                    <Text style={[styles.statusText, { color: '#EF4444' }]}>Proposition écartée ✗</Text>
                  </View>
                ) : (
                  <View style={{ gap: 12, width: '100%' }}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 }}
                      onPress={() => setShowGroupDropdown(true)}
                    >
                      <Text style={{ color: theme.icon, fontSize: 12, marginRight: 8 }}>Cible :</Text>
                      <Text style={{ color: theme.text, flex: 1, fontSize: 14 }}>{selectedGroup?.name || 'Sélectionner un groupe'}</Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={theme.icon} />
                    </TouchableOpacity>
                    <View style={styles.btnRow}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn, { borderColor: theme.error || '#EF4444' }]} 
                        onPress={() => handleRejectEvent(item.id, idx, event)}
                      >
                        <MaterialIcons name="close" size={20} color={theme.error || '#EF4444'} />
                        <Text style={[styles.btnText, { color: theme.error || '#EF4444' }]}>Refuser</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.confirmBtn, { backgroundColor: theme.primary }]} 
                        onPress={() => handleConfirmEvent(item.id, idx, event)}
                      >
                        <MaterialIcons name="check" size={20} color="#FFFFFF" />
                        <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Planifier</Text>
                      </TouchableOpacity>
                    </View>
                </View>
                )}
              </View>
            </View>
            );
          })}
          {/* UI pour la Création de Périodisation */}
          {!isUser && item.proposedPeriodization && (
            <View style={[styles.proposalCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={styles.proposalHeader}>
                <View style={[styles.typeBadge, { backgroundColor: (item.proposedPeriodization.color || '#3B82F6') + '20' }]}>
                  <MaterialIcons name="date-range" size={14} color={item.proposedPeriodization.color || '#3B82F6'} />
                  <Text style={[styles.typeBadgeText, { color: item.proposedPeriodization.color || '#3B82F6' }]}>NOUVEAU CYCLE</Text>
                </View>
              </View>
              <Text style={[styles.proposalTitle, { color: theme.text }]}>{item.proposedPeriodization.name}</Text>
              <Text style={[styles.proposalDesc, { color: theme.icon }]}>
                Du {item.proposedPeriodization.start_date} au {item.proposedPeriodization.end_date}
              </Text>
              <View style={styles.confirmSection}>
                {confirmedEventIds[item.id] === 'confirmed' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}><MaterialIcons name="check-circle" size={18} color="#10B981" /><Text style={[styles.statusText, { color: '#10B981' }]}>Cycle créé ! ✓</Text></View>
                ) : confirmedEventIds[item.id] === 'rejected' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#EF444420' }]}><MaterialIcons name="cancel" size={18} color="#EF4444" /><Text style={[styles.statusText, { color: '#EF4444' }]}>Proposition écartée ✗</Text></View>
                ) : (
                  <View style={{ gap: 12, width: '100%' }}>
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceSecondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 }}
                      onPress={() => setShowGroupDropdown(true)}
                    >
                      <Text style={{ color: theme.icon, fontSize: 12, marginRight: 8 }}>Cible :</Text>
                      <Text style={{ color: theme.text, flex: 1, fontSize: 14 }}>{selectedGroup?.name || 'Sélectionner un groupe'}</Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color={theme.icon} />
                    </TouchableOpacity>
                    <View style={styles.btnRow}>
                      <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={() => handleConfirmPeriodization(item.id, item.proposedPeriodization)}>
                      <MaterialIcons name="check" size={16} color="#FFF" /><Text style={styles.btnText}>Confirmer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rejectBtn, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => handleRejectPeriodization(item.id, item.proposedPeriodization)}>
                      <MaterialIcons name="close" size={16} color={theme.text} /><Text style={[styles.btnText, { color: theme.text }]}>Ajuster</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                )}
              </View>
            </View>
          )}

          {/* UI pour l'Ajout d'Exercice */}
          {!isUser && item.proposedExercise && (
            <View style={[styles.proposalCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={styles.proposalHeader}>
                <View style={[styles.typeBadge, { backgroundColor: '#8B5CF620' }]}>
                  <MaterialIcons name="fitness-center" size={14} color="#8B5CF6" />
                  <Text style={[styles.typeBadgeText, { color: '#8B5CF6' }]}>NOUVEL EXERCICE</Text>
                </View>
              </View>
              <Text style={[styles.proposalTitle, { color: theme.text }]}>{item.proposedExercise.name}</Text>
              <Text style={[styles.proposalDesc, { color: theme.icon }]}>Catégorie: {item.proposedExercise.category}</Text>
              {item.proposedExercise.primary_muscle && (
                <Text style={[styles.proposalDesc, { color: theme.icon, marginTop: 4 }]}>Cible: {item.proposedExercise.primary_muscle}</Text>
              )}
              {item.proposedExercise.description && (
                <Text style={[styles.proposalDesc, { color: theme.text, marginTop: 8, fontStyle: 'italic' }]}>"{item.proposedExercise.description}"</Text>
              )}
              <View style={styles.confirmSection}>
                {confirmedEventIds[item.id] === 'confirmed' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}><MaterialIcons name="check-circle" size={18} color="#10B981" /><Text style={[styles.statusText, { color: '#10B981' }]}>Ajouté à la bibliothèque ! ✓</Text></View>
                ) : confirmedEventIds[item.id] === 'rejected' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#EF444420' }]}><MaterialIcons name="cancel" size={18} color="#EF4444" /><Text style={[styles.statusText, { color: '#EF4444' }]}>Proposition écartée ✗</Text></View>
                ) : (
                  <View style={styles.btnRow}>
                    <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={() => handleConfirmExercise(item.id, item.proposedExercise)}>
                      <MaterialIcons name="check" size={16} color="#FFF" /><Text style={styles.btnText}>Confirmer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rejectBtn, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => handleRejectExercise(item.id, item.proposedExercise)}>
                      <MaterialIcons name="close" size={16} color={theme.text} /><Text style={[styles.btnText, { color: theme.text }]}>Ajuster</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* UI pour la Création de Séance Type */}
          {!isUser && item.proposedTemplate && (
            <View style={[styles.proposalCard, { borderColor: theme.border, backgroundColor: theme.background }]}>
              <View style={styles.proposalHeader}>
                <View style={[styles.typeBadge, { backgroundColor: '#EC489920' }]}>
                  <MaterialIcons name="library-books" size={14} color="#EC4899" />
                  <Text style={[styles.typeBadgeText, { color: '#EC4899' }]}>NOUVELLE SÉANCE TYPE</Text>
                </View>
              </View>
              <Text style={[styles.proposalTitle, { color: theme.text }]}>{item.proposedTemplate.name}</Text>
              <Text style={[styles.proposalDesc, { color: theme.icon }]}>Type: {item.proposedTemplate.type}</Text>
              <View style={styles.confirmSection}>
                {confirmedEventIds[item.id] === 'confirmed' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}><MaterialIcons name="check-circle" size={18} color="#10B981" /><Text style={[styles.statusText, { color: '#10B981' }]}>Sauvegardée ! ✓</Text></View>
                ) : confirmedEventIds[item.id] === 'rejected' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#EF444420' }]}><MaterialIcons name="cancel" size={18} color="#EF4444" /><Text style={[styles.statusText, { color: '#EF4444' }]}>Proposition écartée ✗</Text></View>
                ) : (
                  <View style={styles.btnRow}>
                    <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={() => handleConfirmTemplate(item.id, item.proposedTemplate)}>
                      <MaterialIcons name="check" size={16} color="#FFF" /><Text style={styles.btnText}>Confirmer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.rejectBtn, { borderColor: theme.border, borderWidth: 1 }]} onPress={() => handleRejectTemplate(item.id, item.proposedTemplate)}>
                      <MaterialIcons name="close" size={16} color={theme.text} /><Text style={[styles.btnText, { color: theme.text }]}>Ajuster</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}

          {!isUser && item.sources && item.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <View style={[styles.sourceDivider, { backgroundColor: theme.border }]} />
              <Text style={[styles.sourcesHeader, { color: theme.icon }]}>Sources :</Text>
              <View style={styles.sourcesList}>
                {item.sources.map((source, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.sourceBadge, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}
                    onPress={() => Linking.openURL(source.url)}
                  >
                    <MaterialIcons name="language" size={12} color={theme.primary} />
                    <Text 
                      style={[styles.sourceText, { color: theme.primary }]}
                      numberOfLines={1}
                    >
                      {source.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Animated.View style={[styles.chatContainer, animatedBorderStyle, { backgroundColor: theme.background }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        {isThinking && (
          <View style={styles.thinkingContainer}>
            <BioflowLogo size={16} />
            <Text style={[styles.thinkingText, { color: theme.icon }]}>Bioflow réfléchit...</Text>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity 
            style={{ 
              width: 36, 
              height: 36, 
              borderRadius: 18, 
              backgroundColor: theme.primary + '15', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginRight: 8
            }}
            onPress={() => { fetchMemory(); setShowMemoryModal(true); }}
          >
            <MaterialIcons name="psychology" size={22} color={theme.primary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Demandez un exercice, un plan..."
            placeholderTextColor={theme.icon}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: input.trim() && !isThinking ? theme.primary : theme.border }]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || isThinking}
          >
            {isThinking ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <MaterialIcons name="send" size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Menu déroulant pour changer de groupe */}
      <Modal visible={showGroupDropdown} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownOverlay} activeOpacity={1} onPress={() => setShowGroupDropdown(false)}>
          <View style={[styles.dropdownContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.dropdownHeader, { color: theme.icon }]}>Sélectionner un groupe pour la planification</Text>
            {groups.map(g => (
              <TouchableOpacity 
                key={g.id} 
                style={[styles.dropdownItem, selectedGroup?.id === g.id && { backgroundColor: theme.primary + '10' }]} 
                onPress={() => {
                  setSelectedGroup(g);
                  setShowGroupDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, { color: theme.text, fontWeight: selectedGroup?.id === g.id ? 'bold' : 'normal' }]}>
                  {g.name}
                </Text>
                {selectedGroup?.id === g.id && <MaterialIcons name="check" size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Mémoire IA */}
      <Modal visible={showMemoryModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, height: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ backgroundColor: theme.primary + '20', padding: 8, borderRadius: 12 }}>
                  <MaterialIcons name="psychology" size={24} color={theme.primary} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.text }}>Mémoire IA</Text>
              </View>
              <TouchableOpacity onPress={() => setShowMemoryModal(false)}>
                <MaterialIcons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>
            
            <Text style={{ color: theme.icon, fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
              Bioflow s'appuie sur ces informations de façon permanente. Inscrivez ici votre matériel disponible, votre philosophie d'entraînement, et vos méthodes privilégiées.
            </Text>

            <View style={{ flex: 1, backgroundColor: theme.surfaceSecondary, borderRadius: 16, padding: 2 }}>
              <TextInput
                style={{ flex: 1, padding: 16, color: theme.text, fontSize: 15, textAlignVertical: 'top' }}
                placeholder="Ex: J'entraîne un groupe de sprinters U18. J'ai accès à des medecine balls et des starting blocks, mais pas de salle de musculation. Je privilégie les temps de repos très longs..."
                placeholderTextColor={theme.icon}
                value={memoryText}
                onChangeText={setMemoryText}
                multiline
              />
            </View>

            <TouchableOpacity 
              style={[styles.confirmBtn, { backgroundColor: theme.primary, marginTop: 20, paddingVertical: 14 }]}
              onPress={saveMemory}
              disabled={loadingMemory}
            >
              {loadingMemory ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#FFF" />
                  <Text style={[styles.btnText, { fontSize: 16 }]}>Mémoriser</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    margin: 10,
    marginBottom: Platform.OS === 'ios' ? 100 : 85, // Pour éviter la tabBar
    borderRadius: 24,
    overflow: 'hidden',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowModel: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageBubbleUser: {
    borderBottomRightRadius: 4,
  },
  messageBubbleModel: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  systemMessageText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 10,
    gap: 8,
  },
  thinkingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sourcesContainer: {
    marginTop: 10,
    width: '100%',
  },
  sourceDivider: {
    height: 1,
    width: '100%',
    marginVertical: 8,
  },
  sourcesHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    maxWidth: '100%',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '500',
  },
  proposalCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    width: '100%',
  },
  proposalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  proposalDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  proposalDesc: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
  },
  exerciseList: {
    marginTop: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  exerciseRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
  },
  exTitleText: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  exNoteText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  exNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exDetailsText: {
    fontSize: 12,
    marginTop: 2,
  },
  confirmSection: {
    marginTop: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  btnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  dropdownContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingBottom: 12,
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    marginBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  dropdownItemText: {
    fontSize: 15,
  },
});
