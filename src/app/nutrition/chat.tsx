import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { Card } from '../../components/Card';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { CDLogo } from '../../components/CDLogo';
import { WeightPickerWheel } from '../../components/WeightPickerWheel';
import { HeightPickerWheel } from '../../components/HeightPickerWheel';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { fetchAthleteAIContext } from './_aiContext';
import { generateAndShareReport } from '../../lib/pdfGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
};

const VIEW_STATES = {
  LOADING: 'LOADING',
  LANDING: 'LANDING',
  HUB: 'HUB',
  CHAT: 'CHAT',
  CHECKIN: 'CHECKIN',
};

const tools = [{
  functionDeclarations: [
    {
      name: "finalize_initial_assessment",
      description: "Appelée automatiquement par l'IA une fois l'enquête initiale terminée. Compile le rapport et génère les premiers objectifs chiffrés. Remplit ai_athlete_memory.",
      parameters: {
        type: "OBJECT",
        properties: {
          baseline_report: { type: "STRING", description: "Synthèse détaillée du bilan: points forts, métabolisme et conseils." },
          preferences: { 
            type: "OBJECT", 
            description: "Objet contenant les préférences",
            properties: {
              allergies: { type: "STRING" },
              aversions: { type: "STRING" },
              favorites: { type: "STRING" }
            }
          },
          clinical_state: { type: "STRING", description: "digestion, sommeil, historique de blessures" },
          targets_per_activity: { 
            type: "OBJECT", 
            description: "Objet contenant les macros",
            properties: {
              sedentary: { type: "OBJECT", properties: { calories: { type: "NUMBER" }, proteins: { type: "NUMBER" }, carbs: { type: "NUMBER" }, fats: { type: "NUMBER" } } },
              light: { type: "OBJECT", properties: { calories: { type: "NUMBER" }, proteins: { type: "NUMBER" }, carbs: { type: "NUMBER" }, fats: { type: "NUMBER" } } },
              moderate: { type: "OBJECT", properties: { calories: { type: "NUMBER" }, proteins: { type: "NUMBER" }, carbs: { type: "NUMBER" }, fats: { type: "NUMBER" } } },
              intense: { type: "OBJECT", properties: { calories: { type: "NUMBER" }, proteins: { type: "NUMBER" }, carbs: { type: "NUMBER" }, fats: { type: "NUMBER" } } },
              very_intense: { type: "OBJECT", properties: { calories: { type: "NUMBER" }, proteins: { type: "NUMBER" }, carbs: { type: "NUMBER" }, fats: { type: "NUMBER" } } }
            }
          }
        },
        required: ["baseline_report", "targets_per_activity"]
      }
    },
    {
      name: "update_memory",
      description: "Appelée lors des suivis de routine pour mettre à jour le dossier si une nouvelle information apparaît (ex: lassitude d'un aliment, mauvaise digestion).",
      parameters: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", enum: ["preferences", "clinical_state", "general"] },
          new_information: { type: "STRING" }
        },
        required: ["category", "new_information"]
      }
    },
    {
      name: "adjust_macros",
      description: "Appelée par l'IA pour modifier les cibles macros si le poids stagne ou si la phase d'entraînement change.",
      parameters: {
        type: "OBJECT",
        properties: {
          new_kcal: { type: "NUMBER" },
          new_proteins: { type: "NUMBER" },
          new_carbs: { type: "NUMBER" },
          new_fats: { type: "NUMBER" },
          reason: { type: "STRING" }
        },
        required: ["new_kcal", "new_proteins", "new_carbs", "new_fats", "reason"]
      }
    }
  ]
}];

export default function AINutritionHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [viewState, setViewState] = useState(VIEW_STATES.LOADING);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const [nutritionProfile, setNutritionProfile] = useState<any>(null);
  const [athleteMemory, setAthleteMemory] = useState<any>(null);
  const [athleteGender, setAthleteGender] = useState('Homme');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      startBilan();
      return;
    }
    const { data } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('athlete_id', user.id)
      .maybeSingle();

    const { data: memoryData } = await supabase
      .from('ai_athlete_memory')
      .select('*')
      .eq('athlete_id', user.id)
      .maybeSingle();
      
    const { data: profileBaseData } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', user.id)
      .maybeSingle();

    if (profileBaseData && profileBaseData.gender) {
      setAthleteGender(profileBaseData.gender);
    }
      
    setAthleteMemory(memoryData);

    if (data && data.is_bilan_done) {
      setNutritionProfile(data);
      if (params.autoStart === 'true') {
        startChat();
      } else {
        setViewState(VIEW_STATES.HUB);
      }
    } else {
      startBilan();
    }
  };

  useEffect(() => {
    if (!nutritionProfile?.is_bilan_done && viewState === VIEW_STATES.CHAT) {
      if (messages.length > 0) {
        AsyncStorage.setItem('@bioathlete_assessment_chat', JSON.stringify(messages)).catch(() => {});
      }
    }
  }, [messages, nutritionProfile, viewState]);

  const startBilan = async () => {
    setViewState(VIEW_STATES.CHAT);
    try {
      const saved = await AsyncStorage.getItem('@bioathlete_assessment_chat');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {}
    
    setMessages([]);
    simulateAIResponse("Bonjour, je souhaite commencer mon bilan nutritionnel.", VIEW_STATES.CHAT, [{ role: 'user', parts: [{ text: "Bonjour, je souhaite commencer mon bilan nutritionnel." }] }]);
  };

  const startCheckin = () => {
    setViewState(VIEW_STATES.CHECKIN);
    setMessages([
      {
        id: Date.now().toString(),
        text: "C'est l'heure de faire le point ! 📊\n\nPour commencer, peux-tu me donner ton poids actuel (et ton % de masse grasse si tu as utilisé un impédancemètre) ?",
        isUser: false,
      }
    ]);
  };

  const startChat = () => {
    setViewState(VIEW_STATES.CHAT);
    setMessages([
      {
        id: Date.now().toString(),
        text: "Bonjour ! Prêt pour optimiser ta nutrition aujourd'hui ? Pose-moi tes questions !",
        isUser: false,
      }
    ]);
  };

  const simulateAIResponse = async (userText: string | null, currentView: string, explicitHistory: any[] = []) => {
    setIsTyping(true);
    
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "⚠️ La clé API Gemini n'est pas configurée dans l'environnement (.env).", isUser: false }]);
      setIsTyping(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const contextData = await fetchAthleteAIContext(user?.id || '');

      let geminiHistory = explicitHistory.length > 0 ? explicitHistory : messages.map(m => ({
        role: m.isUser ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      if (userText && explicitHistory.length === 0) {
        geminiHistory.push({ role: 'user', parts: [{ text: userText }] });
      }

      let stateInstruction = "";
      if (!nutritionProfile?.is_bilan_done && currentView === VIEW_STATES.CHAT) {
        stateInstruction = `[MODE ENQUÊTE - BILAN INITIAL]
L'athlète effectue son bilan initial. Ton but est de construire son dossier complet.
POSE LES QUESTIONS SÉQUENTIELLEMENT, JAMAIS EN BLOC (une à la fois) pour simuler un entretien clinique.
TA TOUTE PREMIÈRE QUESTION DOIT EXPLICITEMENT DEMANDER SON POIDS (Vérifie d'abord si on l'a déjà: Poids=${contextData?.profile?.weightkg || '?'}).
TA DEUXIÈME QUESTION DOIT EXPLICITEMENT DEMANDER SA TAILLE (Vérifie d'abord si on l'a déjà: Taille=${contextData?.profile?.heightcm || '?'}).
TA TROISIÈME QUESTION DOIT EXPLICITEMENT DEMANDER SON ÂGE (Vérifie d'abord si on l'a déjà: Âge=${contextData?.profile?.birthdate ? 'Oui' : 'Non'}).
Ne demande que les informations manquantes parmi ces trois points.
Rubriques à explorer ENSUITE :
3. Équipement de suivi : Demande-lui s'il possède une balance à disposition, et si oui, s'il s'agit d'une balance classique ou d'un impédancemètre.
4. Charge Athlétique : Fréquence, type de séances, échéances.
5. Modèle Alimentaire : Rythme des repas, hydratation, suppléments.
6. Tolérances Cliniques : Allergies, aversions, sommeil, digestion.

Dès que tu as toutes ces informations, utilise OBLIGATOIREMENT l'outil 'finalize_initial_assessment' pour valider le bilan.
Tu DOIS impérativement calculer le BMR de l'athlète puis générer dans 'targets_per_activity' les macros exacts pour TOUS les niveaux d'activité, en utilisant obligatoirement les clés anglaises suivantes : sedentary, light, moderate, intense, very_intense.
Méthode de calcul stricte : 
1. BMR (Mifflin-St Jeor).
2. Calories = BMR * facteur (sedentary:1.2, light:1.375, moderate:1.55, intense:1.725, very_intense:1.9).
3. Protéines = 2.0g/kg de poids corporel.
4. Lipides = 1.0g/kg de poids corporel.
5. Glucides = le reste des calories divisé par 4.
Dans le champ 'baseline_report' de l'outil, rédige un rapport de nutrition professionnel TRÈS détaillé (analyse de ses habitudes, points à surveiller, conseils d'hydratation, avis sur son sommeil/digestion). Ce rapport finira en PDF pour lui.
CRITIQUE ET SÉPARATION STRICTE : Tu dois choisir un seul mode. Soit tu réponds par du texte (pour poser une question), soit tu appelles la fonction de sauvegarde. Tu ne dois JAMAIS essayer de faire les deux en même temps. La fonction 'finalize_initial_assessment' ne doit être appelée que lorsque TOUTES les informations sont collectées. S'il manque une seule information (comme l'âge, la taille, etc.), tu dois poser une question textuelle SANS appeler l'outil. Ne génère jamais de texte d'introduction si tu appelles l'outil.`;
      } else if (currentView === VIEW_STATES.CHECKIN) {
        stateInstruction = `[MODE SUIVI - CHECK-IN]
L'athlète effectue son check-in régulier. Demande comment il se sent. Si un ajustement est nécessaire, utilise l'outil 'adjust_macros' puis conclus. S'il mentionne une nouvelle intolérance ou préférence, utilise l'outil 'update_memory'.`;
      } else {
        stateInstruction = `[MODE SUIVI - CHAT LIBRE]
Dossier de l'athlète (ai_athlete_memory) :
- Bilan initial : ${athleteMemory?.baseline_report || 'Aucun'}
- Préférences : ${JSON.stringify(athleteMemory?.preferences || {})}
- État clinique : ${athleteMemory?.clinical_state || 'Aucun'}

Si une nouvelle information clinique ou préférence apparaît, utilise l'outil 'update_memory'.
S'il est pertinent d'ajuster ses macros, utilise l'outil 'adjust_macros'.
Réponds de manière concise, experte et motivante.`;
      }

      const calculateAge = (birthdate: string) => {
        if (!birthdate) return '?';
        const today = new Date();
        const birthDate = new Date(birthdate);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
      };

      const systemPrompt = `Tu es Bioflow, un coach de nutrition sportive olympique intégré dans BioAthlete. Tu parles directement à l'athlète (tutoiement).
Ne dis JAMAIS "En tant qu'IA".
[Contexte Temporel] : Nous sommes le ${new Date().toLocaleString('fr-FR')}


Données réelles :
- Poids : ${contextData?.profile?.weightkg || '?'} kg | Taille : ${contextData?.profile?.heightcm || '?'} cm
- Âge : ${calculateAge(contextData?.profile?.birthdate)} ans | Sexe : ${contextData?.profile?.gender || '?'}
- Objectifs actuels : ${contextData?.nutrition?.target_calories || '?'} kcal (P:${contextData?.nutrition?.target_proteins} G:${contextData?.nutrition?.target_carbs} L:${contextData?.nutrition?.target_fats})
- Repas : ${JSON.stringify(contextData?.nutrition?.meal_distribution || {})}
- Checkin aujourd'hui : ${contextData?.todayCheckin ? 'Oui' : 'Non'}
${contextData?.hasPainToday ? '⚠️ DOULEUR SIGNALÉE : Adapte ton discours.' : ''}

${stateInstruction}`;

      const callGemini = async (history: any[]) => {
        const activeTools = (!nutritionProfile?.is_bilan_done && history.length < 8) ? undefined : tools;
        const bodyPayload: any = {
          contents: history,
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
        };
        if (activeTools) bodyPayload.tools = activeTools;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });
        const d = await response.json();
        if (d.error) throw new Error(d.error.message);
        return d;
      };

      let data = await callGemini(geminiHistory);
      let parts = data.candidates?.[0]?.content?.parts || [];
      let functionCallPart = parts.find((p: any) => p.functionCall);
      let initialTextPart = parts.find((p: any) => p.text);
      let initialText = initialTextPart?.text || "";
      let textPart = initialTextPart;
      let shouldReturnToHub = false;

      // Handle Function Calling loop
      if (functionCallPart) {
        const fc = functionCallPart.functionCall;
        let functionResponseData: any = {};

        if (fc.name === 'finalize_initial_assessment') {
          if (user) {
            let targets = {};
            try { targets = typeof fc.args.targets_per_activity === 'string' ? JSON.parse(fc.args.targets_per_activity) : (fc.args.targets_per_activity || {}); } catch(e) {}
            
            let prefs = {};
            try { prefs = typeof fc.args.preferences === 'string' ? JSON.parse(fc.args.preferences) : (fc.args.preferences || {}); } catch(e) {}

            const baseLevel = targets["moderate"] || targets["Modéré"] || Object.values(targets)[0] || { calories: 2500, proteins: 150, carbs: 250, fats: 80 };
            
            await supabase.from('ai_athlete_memory').upsert({
              athlete_id: user.id,
              baseline_report: fc.args.baseline_report,
              preferences: prefs,
              clinical_state: fc.args.clinical_state || '',
              macro_targets: targets
            }, { onConflict: 'athlete_id' });
            
            await supabase.from('nutrition_profiles').upsert({
              athlete_id: user.id,
              target_calories: baseLevel.calories,
              target_proteins: baseLevel.proteins,
              target_carbs: baseLevel.carbs,
              target_fats: baseLevel.fats,
              activity_level: "Modéré",
              is_bilan_done: true
            }, { onConflict: 'athlete_id' });
          }
          functionResponseData = { status: "success", message: "Dis à l'athlète exactement ceci : 'Le bilan est terminé. Tes objectifs nutritionnels sont maintenant disponibles dans tes paramètres. Tu pourras y ajuster ton niveau d'activité (sédentaire, intense, etc.) et ta répartition par repas à ta convenance.'" };
          shouldReturnToHub = true;
        } else if (fc.name === 'update_memory') {
          let currentMem = athleteMemory || {};
          let updates: any = {};
          if (fc.args.category === 'preferences') {
             updates.preferences = { ...(currentMem.preferences || {}), note: fc.args.new_information };
          } else {
             updates.clinical_state = currentMem.clinical_state ? currentMem.clinical_state + "\n" + fc.args.new_information : fc.args.new_information;
          }
          if (user) {
             await supabase.from('ai_athlete_memory').update(updates).eq('athlete_id', user.id);
          }
          functionResponseData = { status: "success", message: "Mémoire mise à jour." };
        } else if (fc.name === 'adjust_macros') {
          if (user) {
             await supabase.from('nutrition_profiles').update({
               target_calories: fc.args.new_kcal,
               target_proteins: fc.args.new_proteins,
               target_carbs: fc.args.new_carbs,
               target_fats: fc.args.new_fats
             }).eq('athlete_id', user.id);
             
             await supabase.from('ai_athlete_memory').update({
               macro_targets: { calories: fc.args.new_kcal, proteins: fc.args.new_proteins, carbs: fc.args.new_carbs, fats: fc.args.new_fats }
             }).eq('athlete_id', user.id);
          }
          functionResponseData = { status: "success", message: "Macros ajustées avec succès." };
        }

        geminiHistory.push({ role: 'model', parts: [{ functionCall: fc }] });
        geminiHistory.push({ role: 'function', parts: [{ functionResponse: { name: fc.name, response: functionResponseData } }] });
        
        data = await callGemini(geminiHistory);
        parts = data.candidates?.[0]?.content?.parts || [];
        let secondTextPart = parts.find((p: any) => p.text);
        let secondText = secondTextPart?.text || "";
        
        textPart = { text: initialText + (initialText && secondText ? "\n\n" : "") + secondText };
      }

      let generatedResponse = textPart?.text || "";
      
      if (!generatedResponse && data.candidates?.[0]?.finishReason) {
        generatedResponse = `(Erreur API: Raison d'arrêt = ${data.candidates[0].finishReason})`;
      } else if (!generatedResponse) {
        generatedResponse = "Désolé, je n'ai pas pu formuler de réponse. La structure renvoyée par le serveur était vide.";
      }

      // Retrait silencieux des éventuelles balises quick_replies résiduelles dans le modèle
      if (generatedResponse.includes('<quick_replies>')) {
        generatedResponse = generatedResponse.replace(/<quick_replies>[\s\S]*?<\/quick_replies>/, '').trim();
      }

      if (generatedResponse) {
        setMessages(prev => [...prev, { id: Date.now().toString(), text: generatedResponse, isUser: false }]);
      }
      
      if (shouldReturnToHub) {
        setNutritionProfile((prev: any) => ({ ...prev, is_bilan_done: true }));
        AsyncStorage.removeItem('@bioathlete_assessment_chat').catch(() => {});
      }

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), text: "Oups, je réfléchis un peu trop lentement… Réessaie !", isUser: false }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), text: text.trim(), isUser: true };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    simulateAIResponse(text.trim(), viewState);
  };

  const editLastMessage = () => {
    const lastUserIndex = [...messages].reverse().findIndex(m => m.isUser);
    if (lastUserIndex === -1) return;
    
    const actualIndex = messages.length - 1 - lastUserIndex;
    const msgToEdit = messages[actualIndex];
    
    setInputText(msgToEdit.text);
    setMessages(prev => prev.slice(0, actualIndex));
  };

  useEffect(() => {
    if (viewState === VIEW_STATES.CHAT || viewState === VIEW_STATES.CHECKIN) {
      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    }
  }, [messages, isTyping, viewState]);

  const renderMessage = ({ item, index }: { item: Message, index: number }) => {
    const isLastUserMessage = item.isUser && index === messages.length - 1 - [...messages].reverse().findIndex(m => m.isUser);
    
    return (
      <Animated.View entering={FadeInUp.delay(50).springify()} style={[styles.messageWrapper, item.isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
        {!item.isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: '#4F46E5' }]}>
            <MaterialIcons name="auto-awesome" size={16} color="#FFF" />
          </View>
        )}
        <View style={[styles.messageBubble, item.isUser ? [styles.messageBubbleUser, { backgroundColor: theme.primary }] : [styles.messageBubbleAI, { backgroundColor: theme.surfaceSecondary }]]}>
          <Text style={[styles.messageText, item.isUser ? styles.messageTextUser : [styles.messageTextAI, { color: theme.text }]]}>{item.text}</Text>
        </View>
        {isLastUserMessage && (
          <TouchableOpacity onPress={editLastMessage} style={{ marginLeft: 8, alignSelf: 'flex-end', marginBottom: 4 }}>
            <MaterialIcons name="edit" size={16} color={theme.icon} />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };


  const renderHub = () => {
    if (!nutritionProfile) return null;
    const isCheckinDue = nutritionProfile.next_checkin_date && new Date(nutritionProfile.next_checkin_date) < new Date();

    return (
      <ScrollView contentContainerStyle={styles.hubContainer} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.hubHeaderRow}>
            <View style={[styles.aiAvatar, { backgroundColor: '#4F46E5', width: 48, height: 48, borderRadius: 24 }]}>
              <MaterialIcons name="auto-awesome" size={28} color="#FFF" />
            </View>
            <View style={{ marginLeft: Layout.spacing.md, flex: 1 }}>
              <Text style={[styles.hubTitle, { color: theme.text }]}>Bioflow Nutrition</Text>
              <Text style={[styles.hubSubtitle, { color: theme.icon }]}>Ton coach virtuel intelligent</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <Card style={styles.goalCard}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: Layout.spacing.md }]}>Objectifs Actuels</Text>
            
            <View style={styles.goalRow}>
              <View style={styles.goalCol}>
                <Text style={[styles.goalLabel, { color: theme.icon }]}>Macro Cible</Text>
                <Text style={[styles.goalValue, { color: theme.primary }]}>{nutritionProfile.target_calories} kcal</Text>
              </View>
              <View style={styles.goalCol}>
                <Text style={[styles.goalLabel, { color: theme.icon }]}>Prot / Glu / Lip</Text>
                <Text style={[styles.goalValue, { color: theme.text }]}>{nutritionProfile.target_proteins}g / {nutritionProfile.target_carbs}g / {nutritionProfile.target_fats}g</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.actionContainer}>
          <CustomButton 
            title="Tchatter avec Bioflow" 
            onPress={startChat} 
            icon={<MaterialIcons name="chat-bubble" size={20} color="#1A1D24" />} 
            style={{ width: '100%', marginBottom: Layout.spacing.md }} 
          />
          <View style={{ position: 'relative' }}>
            <CustomButton 
              title="Faire un point nutritionnel" 
              variant="secondary"
              onPress={startCheckin} 
              icon={<MaterialIcons name="analytics" size={20} color="#FFF" />} 
              style={{ width: '100%' }} 
            />
            {isCheckinDue && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>!</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderChatInterface = () => {
    // Le premier message invisible de l'utilisateur n'est pas dans l'état local `messages`, donc la réponse de l'IA est le message #1
    const isWaitingForWeight = viewState === VIEW_STATES.CHAT && !nutritionProfile?.is_bilan_done && messages.length === 1;
    const isWaitingForHeight = viewState === VIEW_STATES.CHAT && !nutritionProfile?.is_bilan_done && messages.length === 3;

    return (
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.chatContainer, (isWaitingForWeight || isWaitingForHeight) && { paddingBottom: 350 }]}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => 
            <View>
              {isTyping && (
                <View style={styles.messageWrapperAI}>
                  <View style={[styles.aiAvatar, { backgroundColor: '#4F46E5' }]}>
                    <MaterialIcons name="auto-awesome" size={16} color="#FFF" />
                  </View>
                  <View style={[styles.messageBubbleAI, { backgroundColor: theme.surfaceSecondary }]}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                </View>
              )}
              {nutritionProfile?.is_bilan_done && viewState === VIEW_STATES.CHAT && (
                <Animated.View entering={FadeInUp.delay(500).springify()} style={{ alignItems: 'center', marginVertical: 30 }}>
                  <TouchableOpacity 
                    onPress={() => user && generateAndShareReport(user.id)}
                    style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30, flexDirection: 'row', alignItems: 'center', shadowColor: theme.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
                  >
                    <FontAwesome5 name="file-pdf" size={20} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Télécharger mon rapport (PDF)</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.icon, fontSize: 12, marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                    Retrouvez également ce rapport à tout moment dans Paramètres Nutrition.
                  </Text>
                </Animated.View>
              )}
            </View>
          }
        />
        
        {isWaitingForWeight ? (
          <View style={{ position: 'absolute', bottom: 0, width: '100%', zIndex: 10 }}>
            <WeightPickerWheel onValidate={(weight) => sendMessage(`Mon poids actuel est de ${weight} kg.`)} />
          </View>
        ) : isWaitingForHeight ? (
          <View style={{ position: 'absolute', bottom: 0, width: '100%', zIndex: 10 }}>
            <HeightPickerWheel gender={athleteGender} onValidate={(height) => sendMessage(`Ma taille est de ${height} cm.`)} />
          </View>
        ) : (
          <View style={[styles.inputArea, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
                placeholder="Écrivez votre réponse..."
                placeholderTextColor={theme.icon}
                value={inputText}
                onChangeText={setInputText}
                multiline maxLength={1000}
              />
              <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.primary : theme.surfaceSecondary }]}
                onPress={() => sendMessage(inputText)} disabled={!inputText.trim() || isTyping}
              >
                <MaterialIcons name="send" size={20} color={inputText.trim() ? '#FFF' : theme.icon} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity 
            onPress={() => {
              if (viewState === VIEW_STATES.CHAT || viewState === VIEW_STATES.CHECKIN) {
                if (nutritionProfile && nutritionProfile.is_bilan_done) {
                  setViewState(VIEW_STATES.HUB);
                } else {
                  router.replace('/(tabs)/nutrition');
                }
              } else {
                router.replace('/(tabs)/nutrition');
              }
            }} 
            style={styles.closeBtn}
          >
            <MaterialIcons name={(viewState === VIEW_STATES.CHAT || viewState === VIEW_STATES.CHECKIN) ? "arrow-back" : "close"} size={28} color={theme.text} />
          </TouchableOpacity>
        }
        title="Bioflow IA"
      />

      {viewState === VIEW_STATES.LOADING && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={theme.primary} /><Text style={{ marginTop: 16, color: theme.text, fontSize: 16, fontWeight: 'bold' }}>Analyse par l'IA en cours...</Text></View>
      )}
      {viewState === VIEW_STATES.HUB && renderHub()}
      {(viewState === VIEW_STATES.CHAT || viewState === VIEW_STATES.CHECKIN) && renderChatInterface()}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: { padding: Layout.spacing.xs },
  keyboardView: { flex: 1 },
  chatContainer: { padding: Layout.spacing.md, paddingBottom: Layout.spacing.xl },
  messageWrapper: { flexDirection: 'row', marginBottom: Layout.spacing.md, alignItems: 'flex-end' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  messageWrapperAI: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  messageBubble: { maxWidth: '80%', padding: Layout.spacing.md, borderRadius: 20 },
  messageBubbleUser: { borderBottomRightRadius: 4 },
  messageBubbleAI: { borderBottomLeftRadius: 4 },
  messageText: { fontSize: Typography.sizes.md, lineHeight: 22 },
  messageTextUser: { color: '#FFF' },
  messageTextAI: {},
  typingIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.md },
  inputArea: { padding: Layout.spacing.md, paddingBottom: Platform.OS === 'ios' ? 30 : Layout.spacing.md, borderTopWidth: 1 },
  suggestionsScroll: { marginBottom: Layout.spacing.sm },
  suggestionsContainer: { paddingBottom: Layout.spacing.xs, gap: Layout.spacing.sm },
  suggestionChip: { paddingHorizontal: Layout.spacing.md, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  suggestionText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 22, paddingHorizontal: Layout.spacing.md, paddingTop: 12, paddingBottom: 12, fontSize: Typography.sizes.md },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: Layout.spacing.sm },
  landingContainer: { flex: 1, padding: Layout.spacing.xl, justifyContent: 'center', alignItems: 'center' },
  landingContent: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  landingIconWrapper: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: Layout.spacing.xl },
  landingTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, marginBottom: Layout.spacing.md, textAlign: 'center' },
  landingDesc: { fontSize: Typography.sizes.md, lineHeight: 24, textAlign: 'center', paddingHorizontal: Layout.spacing.md },
  landingFooter: { width: '100%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  hubContainer: { padding: Layout.spacing.lg },
  hubHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.xl },
  hubTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  hubSubtitle: { fontSize: Typography.sizes.sm, marginTop: 2 },
  goalCard: { marginBottom: Layout.spacing.xl, padding: Layout.spacing.lg },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Layout.spacing.sm },
  goalCol: { flex: 1 },
  goalLabel: { fontSize: Typography.sizes.sm, marginBottom: 4 },
  goalValue: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  divider: { height: 1, backgroundColor: 'rgba(150,150,150,0.2)', marginVertical: Layout.spacing.md },
  actionContainer: { width: '100%' },
  notificationBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#EF4444', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1A1D24' },
  notificationBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
