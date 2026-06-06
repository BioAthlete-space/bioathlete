import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, View, Text, TextInput, TouchableOpacity, 
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { Card } from '../../components/Card';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeInDown, SlideInRight, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { supabase } from '../../lib/supabase';
import { fetchAthleteAIContext } from './aiContext';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
};

const VIEW_STATES = {
  LOADING: 'LOADING',
  LANDING: 'LANDING',
  HUB: 'HUB',
  ONBOARDING: 'ONBOARDING',
  CHAT: 'CHAT',
  CHECKIN: 'CHECKIN',
};

const ONBOARDING_STEPS = {
  DISCIPLINE: 0,
  TOOLS: 1,
  METRICS: 2,
  GOAL: 3,
};

const CHECKIN_STEPS = {
  WEIGHT: 0,
  ENERGY: 1,
  ADJUSTMENT: 2,
};

export default function AINutritionHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  
  // View states
  const [viewState, setViewState] = useState(VIEW_STATES.LOADING);
  const [subStep, setSubStep] = useState(0);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // New Onboarding specific states
  const [onboardingData, setOnboardingData] = useState({ discipline: '', tools: '', weight: '', height: '', goal: '' });
  const [isOtherMode, setIsOtherMode] = useState(false);
  const [otherText, setOtherText] = useState('');

  // Profile data
  const [nutritionProfile, setNutritionProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setViewState(VIEW_STATES.LANDING);
      return;
    }
    const { data } = await supabase
      .from('nutrition_profiles')
      .select('*')
      .eq('athlete_id', user.id)
      .maybeSingle();

    if (data && data.is_bilan_done) {
      setNutritionProfile(data);
      setViewState(VIEW_STATES.HUB);
    } else {
      setViewState(VIEW_STATES.LANDING);
    }
  };

  const startBilan = () => {
    setViewState(VIEW_STATES.ONBOARDING);
    setSubStep(ONBOARDING_STEPS.DISCIPLINE);
    setOnboardingData({ discipline: '', tools: '', weight: '', height: '', goal: '' });
    setIsOtherMode(false);
    setOtherText('');
  };

  const startCheckin = () => {
    setViewState(VIEW_STATES.CHECKIN);
    setSubStep(CHECKIN_STEPS.WEIGHT);
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

  const getSuggestionsForStep = () => {
    if (viewState === VIEW_STATES.ONBOARDING) {
      if (messages.length < 3) return ["Je fais du Sprint", "Demi-fond", "Lancers"];
      if (messages.length < 5) return ["Balance classique", "Balance impédancemètre"];
      if (messages.length < 7) return ["Perdre du gras", "Prendre de la masse"];
      return [];
    } else if (viewState === VIEW_STATES.CHECKIN) {
      if (messages.length < 3) return ["Poids stable", "J'ai perdu 1kg", "J'ai pris 1kg"];
      if (messages.length < 5) return ["Super énergie !", "Un peu fatigué..."];
      return ["On maintient les objectifs.", "On ajuste les macros."];
    } else if (viewState === VIEW_STATES.CHAT) {
      return ["Que manger avant un sprint ?", "Comment optimiser la récupération ?"];
    }
    return [];
  };

  // Unified AI Response Generator via Gemini
  const simulateAIResponse = async (userText: string, currentView: string, currentStep: number) => {
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

      const geminiHistory = messages.map(m => ({
        role: m.isUser ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));
      geminiHistory.push({ role: 'user', parts: [{ text: userText }] });

      let stateInstruction = "";
      if (currentView === VIEW_STATES.ONBOARDING) {
        stateInstruction = `[CONTEXTE: L'athlète effectue son BILAN INITIAL. Pose des questions (une par une) pour découvrir sa discipline, ses objectifs, et ses outils à disposition (balance). Ton but final est de définir ses besoins caloriques et macros, puis d'inclure EXPLICITEMENT les DEUX balises XML suivantes à la fin de ta réponse pour clôturer le bilan : <finish_onboarding></finish_onboarding> et <update_macros>{"calories": XXXX, "proteins": XX, "carbs": XX, "fats": XX}</update_macros>. Ne génère ces balises QUE quand tu as toutes les infos nécessaires.]`;
      } else if (currentView === VIEW_STATES.CHECKIN) {
        stateInstruction = `[CONTEXTE: L'athlète effectue son CHECK-IN de suivi (toutes les 3 semaines). Il vient d'ajuster son poids sur l'accueil, regarde ses données actuelles. Demande-lui comment il se sent (énergie, perf). Si tu estimes qu'il faut ajuster ses calories ou macros en fonction de son évolution, propose-le et inclus EXPLICITEMENT les DEUX balises XML suivantes à la fin de ta réponse pour valider : <update_macros>{"calories": XXXX, "proteins": XX, "carbs": XX, "fats": XX}</update_macros> et <finish_checkin></finish_checkin>.]`;
      } else {
        stateInstruction = `[CONTEXTE: L'athlète discute librement avec toi. Réponds à ses questions sur la nutrition sportive de manière experte mais très concise.]`;
      }

      const systemPrompt = `Tu es Bioflow Nutrition, le nutritionniste sportif IA de l'application BioAthlete. Tu parles directement à l'athlète. L'application gère uniquement des sportifs pratiquant l'athlétisme.
Ses données actuelles en base :
- Poids : ${contextData?.profile?.weightkg || 'Non renseigné'} kg
- Objectifs caloriques actuels : ${contextData?.nutrition?.target_calories || 'Non défini'} kcal/j
- Profil nutrition : ${JSON.stringify(contextData?.nutrition || {})}
- Historique de repas récent : ${JSON.stringify(contextData?.nutritionLogs || [])}
- Entraînements prévus : ${JSON.stringify(contextData?.workouts || [])}
- Mémoire précédente : ${contextData?.memory || 'Rien à signaler'}

${stateInstruction}

RÈGLES IMPORTANTES:
1. Sois extrêmement concis (adapté à un affichage sur smartphone).
2. Agis comme un vrai nutritionniste humain et chaleureux (utilise des emojis).
3. Utilise ses vraies données chiffrées dans tes réponses. S'il te demande ce qu'il a mangé, lis l'historique de repas.
4. Si tu apprends une préférence ou une habitude importante de l'athlète au cours de la discussion, inclus la balise <update_memory>Texte de la préférence</update_memory> à la fin de ta réponse. L'application la sauvegardera.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiHistory,
          systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      let generatedResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Désolé, je n'ai pas pu formuler de réponse.";
      let shouldReturnToHub = false;

      // Parse and execute XML Tags
      if (generatedResponse.includes('<update_macros>')) {
        const match = generatedResponse.match(/<update_macros>([\s\S]*?)<\/update_macros>/);
        if (match && user) {
          try {
            const macros = JSON.parse(match[1]);
            await supabase.from('nutrition_profiles').update({
              target_calories: macros.calories,
              target_proteins: macros.proteins,
              target_carbs: macros.carbs,
              target_fats: macros.fats,
            }).eq('athlete_id', user.id);
          } catch(e) { console.error("Error parsing macros XML"); }
        }
        generatedResponse = generatedResponse.replace(/<update_macros>[\s\S]*?<\/update_macros>/, '').trim();
      }

      if (generatedResponse.includes('<update_memory>')) {
        const match = generatedResponse.match(/<update_memory>([\s\S]*?)<\/update_memory>/);
        if (match && user) {
          await supabase.from('athlete_ai_memory').insert({ athlete_id: user.id, memory_text: match[1].trim() });
        }
        generatedResponse = generatedResponse.replace(/<update_memory>[\s\S]*?<\/update_memory>/, '').trim();
      }

      if (generatedResponse.includes('<finish_onboarding>')) {
        if (user) {
          await supabase.from('nutrition_profiles').update({ is_bilan_done: true }).eq('athlete_id', user.id);
        }
        generatedResponse = generatedResponse.replace(/<finish_onboarding>[\s\S]*?<\/finish_onboarding>/, '').replace('<finish_onboarding/>', '').trim();
        shouldReturnToHub = true;
      }

      if (generatedResponse.includes('<finish_checkin>')) {
        if (user) {
          const nextCheckin = new Date();
          nextCheckin.setDate(nextCheckin.getDate() + 21);
          await supabase.from('nutrition_profiles').update({
            last_checkin_date: new Date().toISOString(),
            next_checkin_date: nextCheckin.toISOString(),
          }).eq('athlete_id', user.id);
        }
        generatedResponse = generatedResponse.replace(/<finish_checkin>[\s\S]*?<\/finish_checkin>/, '').replace('<finish_checkin/>', '').trim();
        shouldReturnToHub = true;
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), text: generatedResponse, isUser: false }]);
      
      if (shouldReturnToHub) {
        setTimeout(() => fetchProfile(), 3000);
      }

    } catch (error: any) {
      setMessages(prev => [...prev, { id: Date.now().toString(), text: `Erreur de connexion à l'IA : ${error.message}`, isUser: false }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMsg: Message = { id: Date.now().toString(), text: text.trim(), isUser: true };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    simulateAIResponse(text.trim(), viewState, subStep);
  };

  useEffect(() => {
    if (viewState === VIEW_STATES.ONBOARDING || viewState === VIEW_STATES.CHAT || viewState === VIEW_STATES.CHECKIN) {
      setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
    }
  }, [messages, isTyping, viewState]);

  const renderMessage = ({ item }: { item: Message }) => {
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
      </Animated.View>
    );
  };

  const shimmerPosition = useSharedValue(-400);
  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(400, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerPosition.value }],
  }));

  const renderLandingPage = () => (
    <View style={styles.landingContainer}>
      <Animated.View entering={FadeInDown.delay(100).springify()} style={{ position: 'absolute', top: '15%', alignItems: 'center', width: '100%' }}>
        <Image source={require('../../assets/images/logo-glow.png')} style={{ width: 200, height: 200, resizeMode: 'contain' }} />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()} style={{ width: '100%', alignItems: 'center', marginTop: 100 }}>
        <TouchableOpacity onPress={startBilan} activeOpacity={0.8} style={{ overflow: 'hidden', borderRadius: 40, elevation: 15, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.6, shadowRadius: 20, width: '95%' }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>Faire mon premier bilan nutritionnel</Text>
            
            <Animated.View style={[StyleSheet.absoluteFill, { width: 120, opacity: 0.5 }, shimmerStyle]}>
              <LinearGradient colors={['transparent', 'rgba(255,255,255,0.9)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, transform: [{ skewX: '-30deg' }] }} />
            </Animated.View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

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

            <View style={styles.divider} />

            <View style={styles.goalRow}>
              <View style={styles.goalCol}>
                <Text style={[styles.goalLabel, { color: theme.icon }]}>Objectif 3 Semaines</Text>
                <Text style={[styles.goalValue, { color: theme.text }]}>{nutritionProfile.current_weight_goal ? `${nutritionProfile.current_weight_goal} kg` : 'En cours'}</Text>
              </View>
              <View style={styles.goalCol}>
                <Text style={[styles.goalLabel, { color: theme.icon }]}>Objectif Ultime</Text>
                <Text style={[styles.goalValue, { color: theme.text }]}>{nutritionProfile.ultimate_weight_goal ? `${nutritionProfile.ultimate_weight_goal} kg` : 'À définir'}</Text>
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

  const renderChatInterface = () => (
    <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={() => 
          isTyping ? (
            <View style={styles.typingIndicator}>
              <View style={[styles.aiAvatar, { backgroundColor: '#4F46E5', marginRight: 8 }]}><MaterialIcons name="auto-awesome" size={16} color="#FFF" /></View>
              <View style={[styles.messageBubble, styles.messageBubbleAI, { backgroundColor: theme.surfaceSecondary, paddingVertical: 12, paddingHorizontal: 16 }]}><ActivityIndicator size="small" color={theme.primary} /></View>
            </View>
          ) : null
        }
      />
      <View style={[styles.inputArea, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {getSuggestionsForStep().length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll} contentContainerStyle={styles.suggestionsContainer}>
            {getSuggestionsForStep().map((suggestion, index) => (
              <TouchableOpacity key={index} style={[styles.suggestionChip, { borderColor: theme.border }]} onPress={() => sendMessage(suggestion)}>
                <Text style={[styles.suggestionText, { color: theme.primary }]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
            placeholder="Demande un conseil nutrition..."
            placeholderTextColor={theme.icon}
            value={inputText}
            onChangeText={setInputText}
            multiline maxLength={300}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.primary : theme.surfaceSecondary }]}
            onPress={() => sendMessage(inputText)} disabled={!inputText.trim() || isTyping}
          >
            <MaterialIcons name="send" size={20} color={inputText.trim() ? '#FFF' : theme.icon} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const handleOnboardingNext = async (value: string | null = null) => {
    let newData = { ...onboardingData };
    if (value) {
      if (subStep === ONBOARDING_STEPS.DISCIPLINE) newData.discipline = value;
      if (subStep === ONBOARDING_STEPS.TOOLS) newData.tools = value;
      if (subStep === ONBOARDING_STEPS.GOAL) newData.goal = value;
      setOnboardingData(newData);
    }

    if (subStep < ONBOARDING_STEPS.GOAL) {
      setSubStep(subStep + 1);
      setIsOtherMode(false);
      setOtherText('');
    } else {
      setIsTyping(true);
      setViewState(VIEW_STATES.LOADING); // Show loading spinner
      
      const payloadString = `Discipline: ${newData.discipline}, Outils/Matériel: ${newData.tools}, Poids: ${newData.weight}kg, Taille: ${newData.height}cm, Objectif principal: ${newData.goal}`;
      const prompt = `Voici les réponses du questionnaire du nouvel athlète : ${payloadString}. Calcule ses besoins caloriques et ses macros, puis inclus EXPLICITEMENT les balises XML <update_macros> et <finish_onboarding> à la fin de ta réponse pour valider. Tu n'as pas besoin de lui poser de question, son bilan est terminé.`;
      
      await simulateAIResponse(prompt, VIEW_STATES.ONBOARDING, subStep);
    }
  };

  const renderOnboarding = () => {
    const titles = ["Ta Discipline", "Ton Équipement", "Tes Mensurations", "Ton Objectif"];
    const stepTitle = titles[subStep];

    const getOptions = () => {
      if (subStep === ONBOARDING_STEPS.DISCIPLINE) return [
        { label: "🏃 Sprint", value: "Sprint" }, { label: "🏃‍♂️ Endurance", value: "Endurance" },
        { label: "👟 Sauts", value: "Sauts" }, { label: "💪 Lancers", value: "Lancers" }
      ];
      if (subStep === ONBOARDING_STEPS.TOOLS) return [
        { label: "⚖️ Balance classique", value: "Balance classique" }, { label: "⚡ Impédancemètre", value: "Balance impédancemètre" },
        { label: "📏 Mètre ruban", value: "Mètre ruban" }, { label: "🪞 Juste un miroir !", value: "Aucun équipement, juste le miroir" }
      ];
      if (subStep === ONBOARDING_STEPS.GOAL) return [
        { label: "🔥 Perdre du gras", value: "Perte de gras" }, { label: "🥩 Prise de masse", value: "Prise de muscle" },
        { label: "⚡ Maintenir et performer", value: "Maintien et performance" }
      ];
      return [];
    };

    return (
      <View style={styles.onboardingContainer}>
        <View style={styles.progressBarContainer}>
          <Text style={[styles.progressText, { color: theme.icon }]}>[=== Couloir {subStep + 1}/4 : {stepTitle} ===]</Text>
          <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceSecondary }]}>
            <Animated.View style={[styles.progressBarFill, { backgroundColor: theme.primary, width: `${((subStep + 1) / 4) * 100}%` }]} />
          </View>
        </View>

        <Text style={[styles.questionTitle, { color: theme.text }]}>Sélectionne {subStep === ONBOARDING_STEPS.METRICS ? 'tes infos' : 'ton choix'} :</Text>

        <ScrollView contentContainerStyle={styles.optionsGrid}>
          {subStep !== ONBOARDING_STEPS.METRICS ? (
            <>
              {!isOtherMode ? (
                <>
                  {getOptions().map((opt, i) => (
                    <Animated.View key={i} entering={FadeInUp.delay(i * 50).springify()}>
                      <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => handleOnboardingNext(opt.value)}>
                        <Text style={[styles.optionText, { color: theme.text }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                  <Animated.View entering={FadeInUp.delay(getOptions().length * 50).springify()}>
                    <TouchableOpacity style={[styles.optionCard, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]} onPress={() => setIsOtherMode(true)}>
                      <Text style={[styles.optionText, { color: theme.text }]}>⌨️ Autre / Spécifier...</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              ) : (
                <Animated.View entering={FadeInUp.springify()} style={styles.otherInputContainer}>
                  <TextInput
                    style={[styles.largeInput, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
                    placeholder="Décris ton cas spécifique ici..."
                    placeholderTextColor={theme.icon}
                    value={otherText}
                    onChangeText={setOtherText}
                    multiline
                    autoFocus
                  />
                  <CustomButton title="Valider" onPress={() => handleOnboardingNext(otherText)} disabled={!otherText.trim()} style={{ marginTop: Layout.spacing.lg }} />
                </Animated.View>
              )}
            </>
          ) : (
            <Animated.View entering={FadeInUp.springify()} style={styles.metricsContainer}>
              <View style={styles.metricInputWrapper}>
                <Text style={[styles.metricLabel, { color: theme.text }]}>Poids actuel (kg)</Text>
                <TextInput
                  style={[styles.metricInput, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
                  placeholder="ex: 75.5"
                  placeholderTextColor={theme.icon}
                  keyboardType="numeric"
                  value={onboardingData.weight}
                  onChangeText={(val) => setOnboardingData({ ...onboardingData, weight: val })}
                />
              </View>
              <View style={styles.metricInputWrapper}>
                <Text style={[styles.metricLabel, { color: theme.text }]}>Taille (cm)</Text>
                <TextInput
                  style={[styles.metricInput, { backgroundColor: theme.surfaceSecondary, color: theme.text }]}
                  placeholder="ex: 180"
                  placeholderTextColor={theme.icon}
                  keyboardType="numeric"
                  value={onboardingData.height}
                  onChangeText={(val) => setOnboardingData({ ...onboardingData, height: val })}
                />
              </View>
              <CustomButton 
                title="Continuer" 
                onPress={() => handleOnboardingNext()} 
                disabled={!onboardingData.weight || !onboardingData.height} 
                style={{ marginTop: Layout.spacing.xl }} 
              />
            </Animated.View>
          )}
        </ScrollView>

        {!isOtherMode && subStep !== ONBOARDING_STEPS.METRICS && (
          <TouchableOpacity style={styles.persistentOtherBtn} onPress={() => setIsOtherMode(true)}>
            <Text style={[styles.persistentOtherText, { color: theme.primary }]}>Écrire manuellement</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        leftContent={
          <TouchableOpacity 
            onPress={() => {
              if (viewState === VIEW_STATES.CHAT || viewState === VIEW_STATES.CHECKIN || viewState === VIEW_STATES.ONBOARDING) {
                // If checking in or chatting, go back to HUB (if bilan is done) or back to landing
                if (nutritionProfile && nutritionProfile.is_bilan_done) {
                  setViewState(VIEW_STATES.HUB);
                } else {
                  if (router.canGoBack()) router.back();
                  else router.replace('/(tabs)/nutrition');
                }
              } else {
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)/nutrition');
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
      {viewState === VIEW_STATES.LANDING && renderLandingPage()}
      {viewState === VIEW_STATES.HUB && renderHub()}
      {viewState === VIEW_STATES.ONBOARDING && renderOnboarding()}
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
  notificationBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  onboardingContainer: { flex: 1, padding: Layout.spacing.lg },
  progressBarContainer: { marginBottom: Layout.spacing.xl, alignItems: 'center' },
  progressText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  progressBarTrack: { width: '100%', height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  questionTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, marginBottom: Layout.spacing.lg, textAlign: 'center' },
  optionsGrid: { gap: Layout.spacing.md, paddingBottom: 40 },
  optionCard: { padding: Layout.spacing.lg, borderRadius: Layout.borderRadius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.medium },
  otherInputContainer: { paddingVertical: Layout.spacing.md },
  largeInput: { minHeight: 100, borderRadius: Layout.borderRadius.md, padding: Layout.spacing.md, fontSize: Typography.sizes.md, textAlignVertical: 'top' },
  persistentOtherBtn: { alignItems: 'center', padding: Layout.spacing.md, marginTop: 'auto', marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  persistentOtherText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  metricsContainer: { gap: Layout.spacing.lg, marginTop: Layout.spacing.md },
  metricInputWrapper: { gap: 8 },
  metricLabel: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.medium, marginLeft: 4 },
  metricInput: { height: 50, borderRadius: Layout.borderRadius.md, paddingHorizontal: Layout.spacing.md, fontSize: Typography.sizes.lg },
});
