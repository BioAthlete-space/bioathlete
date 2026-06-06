import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../hooks/useThemeColor';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';
import { CustomButton } from '../components/CustomButton';
import { Chip } from '../components/Chip';
import { CheckinData, PainDetail, SleepQuality, PainType } from '../types/Checkin';
import { calculateSprintFlowScore, ScoreResult } from '../utils/SprintFlowScore';
import { saveCheckin, loadCheckins } from '../services/StorageService';
import { useAthleteProfile } from '../hooks/useAthleteProfile';

const { width } = Dimensions.get('window');

const BODY_ZONES = [
  'Nuque', 'Épaules', 'Dos', 'Lombaires', 
  'Fessiers', 'Quadriceps', 'Ischios', 
  'Mollets', 'Chevilles', 'Pieds', 'Genoux'
];

const PAIN_TYPES: PainType[] = [
  'Courbatures', 'Raideur', 'Gêne', 
  'Douleur articulaire', 'Douleur musculaire', 'Blessure connue'
];

export default function CheckinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAthleteProfile();
  const isFemale = profile.sexe === 'F' || profile.sexe === 'Femme';

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Data State
  const [sleepHoursInt, setSleepHoursInt] = useState<number>(7);
  const [sleepMinutesInt, setSleepMinutesInt] = useState<number>(30);
  
  const [fatigue, setFatigue] = useState<number>(5);
  const [menstrualCycle, setMenstrualCycle] = useState<string>('Aucune');
  const [hasPain, setHasPain] = useState<boolean | null>(null);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  
  // Pain details
  const [painDetails, setPainDetails] = useState<PainDetail[]>([]);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);

  // Result
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);

  useEffect(() => {
    loadCheckins().then(history => {
      const today = new Date();
      const checkinId = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      const todayCheckin = history.find(c => c.id === checkinId);
      if (todayCheckin) {
        setSleepHoursInt(Math.floor(todayCheckin.sleepHours));
        setSleepMinutesInt(Math.round((todayCheckin.sleepHours % 1) * 60));
        setFatigue(todayCheckin.fatigue);
        if (todayCheckin.menstrualCycle) setMenstrualCycle(todayCheckin.menstrualCycle);
        setHasPain(todayCheckin.hasPain);
        if (todayCheckin.painDetails && todayCheckin.painDetails.length > 0) {
          setSelectedZones(todayCheckin.painDetails.map(p => p.zone));
          setPainDetails(todayCheckin.painDetails);
        }
      }
    });
  }, []);

  // --- DYNAMIC STEPS ---
  const steps = [
    { id: 'sleep', title: 'SOMMEIL' },
    { id: 'fatigue', title: 'FATIGUE' }
  ];
  if (isFemale) {
    steps.push({ id: 'menstrual', title: 'RÈGLES' });
  }
  steps.push({ id: 'pain_question', title: 'DOULEURS' });
  
  if (hasPain) {
    steps.push({ id: 'body_map', title: 'BODY MAP' });
    steps.push({ id: 'pain_detail', title: 'DÉTAIL DOULEUR' });
  }
  steps.push({ id: 'result', title: 'RÉSULTAT' });

  const currentStepId = steps[currentStepIndex]?.id;

  const nextStep = () => {
    if (currentStepId === 'body_map') {
      if (selectedZones.length === 0) {
        Alert.alert('Attention', 'Veuillez sélectionner au moins une zone ou revenir en arrière pour indiquer "Non" aux douleurs.');
        return;
      }
      setPainDetails(selectedZones.map(zone => ({ zone, intensity: 5, type: 'Courbatures' })));
      setCurrentZoneIndex(0);
    }
    
    if (currentStepId === 'pain_detail') {
      if (currentZoneIndex < selectedZones.length - 1) {
        setCurrentZoneIndex(prev => prev + 1);
        return;
      } else {
        calculateAndFinish();
      }
    }

    setCurrentStepIndex(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStepId === 'pain_detail') {
      if (currentZoneIndex > 0) {
        setCurrentZoneIndex(prev => prev - 1);
        return;
      }
    }
    
    if (currentStepId === 'result' && hasPain === false) {
      setCurrentStepIndex(steps.findIndex(s => s.id === 'pain_question'));
      return;
    }

    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  const calculateAndFinish = (hasPainOverride?: boolean) => {
    try {
      const totalSleepDecimal = sleepHoursInt + (sleepMinutesInt / 60);
      const finalHasPain = hasPainOverride !== undefined ? hasPainOverride : hasPain;
      
      const data: Partial<CheckinData> = {
        sleepHours: totalSleepDecimal,
        fatigue,
        menstrualCycle: isFemale ? menstrualCycle : undefined,
        hasPain: finalHasPain as boolean,
        painDetails: finalHasPain ? painDetails : [],
      };

      const result = calculateSprintFlowScore(data);
      setScoreResult(result);

      const today = new Date();
      const checkinId = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      
      const finalData = {
        id: checkinId,
        date: today.toISOString(),
        ...data,
        score: result.score
      } as CheckinData;

      saveCheckin(finalData).catch(err => console.error("Erreur saveCheckin:", err));
    } catch (e) {
      console.error("Erreur calculateAndFinish:", e);
      Alert.alert("Erreur", "Une erreur est survenue lors du calcul.");
    }
  };

  // --- RENDERERS ---
  const renderProgress = () => {
    if (currentStepId === 'result') return null;

    return (
      <View style={styles.progressContainer}>
        {Array.from({ length: steps.length - 1 }).map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.progressSegment, 
              { backgroundColor: i <= currentStepIndex ? theme.primary : theme.border }
            ]} 
          />
        ))}
      </View>
    );
  };

  const renderSleep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.questionText, { color: theme.text }]}>Combien de temps avez-vous dormi ?</Text>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 40, gap: 24 }}>
        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSleepHoursInt(Math.min(24, sleepHoursInt + 1))} style={[styles.circleBtn, { backgroundColor: theme.surfaceSecondary }]}>
            <MaterialIcons name="keyboard-arrow-up" size={32} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.timeDisplay, { color: theme.primary }]}>{sleepHoursInt}h</Text>
          <TouchableOpacity onPress={() => setSleepHoursInt(Math.max(0, sleepHoursInt - 1))} style={[styles.circleBtn, { backgroundColor: theme.surfaceSecondary }]}>
            <MaterialIcons name="keyboard-arrow-down" size={32} color={theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 40, fontWeight: 'bold', color: theme.icon, marginTop: -10 }}>:</Text>

        <View style={{ alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSleepMinutesInt((sleepMinutesInt + 10) % 60)} style={[styles.circleBtn, { backgroundColor: theme.surfaceSecondary }]}>
            <MaterialIcons name="keyboard-arrow-up" size={32} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.timeDisplay, { color: theme.primary }]}>{sleepMinutesInt.toString().padStart(2, '0')}m</Text>
          <TouchableOpacity onPress={() => setSleepMinutesInt((sleepMinutesInt - 10 + 60) % 60)} style={[styles.circleBtn, { backgroundColor: theme.surfaceSecondary }]}>
            <MaterialIcons name="keyboard-arrow-down" size={32} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      <CustomButton title="Continuer" onPress={nextStep} style={styles.nextBtn} />
    </View>
  );

  const renderFatigue = () => {
    // Determine color of thumb and value based on fatigue level (0=red to 10=green)
    const getThumbColor = (val: number) => {
      if (val <= 3) return '#F44336'; // Red
      if (val <= 6) return '#FFEB3B'; // Yellow
      return '#4CAF50'; // Green
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.questionText, { color: theme.text }]}>Niveau d'énergie générale ?</Text>
        <Text style={[styles.valueDisplay, { color: getThumbColor(fatigue) }]}>{Math.round(fatigue)} / 10</Text>
        
        <View style={{ width: '100%', position: 'relative', height: 40, justifyContent: 'center' }}>
          <LinearGradient
            colors={['#F44336', '#FFEB3B', '#4CAF50']} // Red to Green
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ position: 'absolute', top: 18, left: 15, right: 15, height: 6, borderRadius: 3 }}
          />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={10}
            value={fatigue}
            onValueChange={setFatigue}
            minimumTrackTintColor="transparent"
            maximumTrackTintColor="transparent"
            thumbTintColor={theme.text}
          />
        </View>

        <View style={styles.sliderLabels}>
          <Text style={{ color: theme.icon }}>0 (Épuisé)</Text>
          <Text style={{ color: theme.icon }}>10 (Pleine forme)</Text>
        </View>
        <CustomButton title="Continuer" onPress={nextStep} style={styles.nextBtn} />
      </View>
    );
  };

  const renderMenstrual = () => {
    const options = ['Aucune', 'Début de cycle', 'Pendant', 'Fin de cycle'];
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.questionText, { color: theme.text }]}>Où en êtes-vous dans votre cycle menstruel ?</Text>
        <View style={styles.optionsContainer}>
          {options.map(opt => (
            <TouchableOpacity 
              key={opt}
              style={[
                styles.optionBtn, 
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                menstrualCycle === opt && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => { setMenstrualCycle(opt); setTimeout(nextStep, 300); }}
            >
              <Text style={[
                styles.optionText, 
                { color: theme.text },
                menstrualCycle === opt && { color: '#FFF' }
              ]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPainQuestion = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.questionText, { color: theme.text }]}>Avez-vous des douleurs aujourd'hui ?</Text>
      <View style={styles.rowOptions}>
        <TouchableOpacity 
          style={[
            styles.halfBtn, 
            { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
            hasPain === false && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => { 
            setHasPain(false); 
            setTimeout(() => {
              calculateAndFinish(false);
              setCurrentStepIndex(prev => prev + 1);
            }, 300); 
          }}
        >
          <Text style={[styles.optionText, { color: theme.text }, hasPain === false && { color: '#FFF' }]}>Non</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.halfBtn, 
            { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
            hasPain === true && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => { 
            setHasPain(true); 
            setTimeout(() => {
              setCurrentStepIndex(prev => prev + 1);
            }, 300); 
          }}
        >
          <Text style={[styles.optionText, { color: theme.text }, hasPain === true && { color: '#FFF' }]}>Oui</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBodyMap = () => {
    const toggleZone = (zone: string) => {
      if (selectedZones.includes(zone)) {
        setSelectedZones(prev => prev.filter(z => z !== zone));
      } else {
        setSelectedZones(prev => [...prev, zone]);
      }
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.questionText, { color: theme.text, marginBottom: 8 }]}>Où avez-vous mal ?</Text>
        <Text style={{ color: theme.icon, textAlign: 'center', marginBottom: 24 }}>Touchez les zones concernées</Text>
        
        <ScrollView style={{ flex: 1, width: '100%' }} contentContainerStyle={{ alignItems: 'center' }}>
           <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingBottom: 40 }}>
             {BODY_ZONES.map(zone => (
               <Chip
                 key={zone}
                 label={zone}
                 isSelected={selectedZones.includes(zone)}
                 onPress={() => toggleZone(zone)}
               />
             ))}
           </View>
        </ScrollView>
        <CustomButton 
          title={`Continuer (${selectedZones.length} sélectionné${selectedZones.length > 1 ? 's' : ''})`} 
          onPress={nextStep} 
          disabled={selectedZones.length === 0}
          style={styles.nextBtn} 
        />
      </View>
    );
  };

  const renderPainDetail = () => {
    const currentZone = selectedZones[currentZoneIndex];
    const currentPain = painDetails[currentZoneIndex];

    if (!currentPain) return null;

    const updateCurrentPain = (updates: Partial<PainDetail>) => {
      setPainDetails(prev => {
        const newDetails = [...prev];
        newDetails[currentZoneIndex] = { ...newDetails[currentZoneIndex], ...updates };
        return newDetails;
      });
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.zoneTitle, { color: theme.primary }]}>Zone : {currentZone} ({currentZoneIndex + 1}/{selectedZones.length})</Text>
        
        <Text style={[styles.subQuestionText, { color: theme.text }]}>Intensité de la douleur ?</Text>
        <Text style={[styles.valueDisplay, { color: theme.primary, fontSize: 24, marginVertical: 8 }]}>{Math.round(currentPain.intensity)} / 10</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          value={currentPain.intensity}
          onValueChange={(val) => updateCurrentPain({ intensity: val })}
          minimumTrackTintColor={theme.primary}
          maximumTrackTintColor={theme.border}
          thumbTintColor={theme.primary}
        />
        
        <Text style={[styles.subQuestionText, { color: theme.text, marginTop: 32 }]}>Type de douleur ?</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={{ flexGrow: 0, marginTop: 16 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingRight: 32 }}
        >
          {PAIN_TYPES.map(pt => (
            <Chip
              key={pt}
              label={pt}
              isSelected={currentPain.type === pt}
              onPress={() => updateCurrentPain({ type: pt })}
            />
          ))}
        </ScrollView>

        <View style={{ flex: 1 }} />
        <CustomButton title={currentZoneIndex < selectedZones.length - 1 ? "Zone suivante" : "Terminer"} onPress={nextStep} style={styles.nextBtn} />
      </View>
    );
  };

  const renderResult = () => {
    if (!scoreResult) {
      return (
        <View style={[styles.stepContainer, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{color: theme.icon, marginTop: 16}}>Calcul de votre score...</Text>
        </View>
      );
    }

    const getScoreMessage = (score: number) => {
      if (score >= 90) return "Excellent ! Vous êtes dans des conditions optimales pour une séance intense aujourd'hui.";
      if (score >= 75) return "Très bon état général. Vous êtes prêt(e) pour un bon entraînement.";
      if (score >= 60) return "Fatigue modérée. Soyez à l'écoute de votre corps pendant l'effort.";
      if (score >= 40) return "Fatigue importante. Privilégiez la récupération ou une séance très légère.";
      return "Risque élevé. Il est fortement conseillé de prendre un jour de repos.";
    };

    return (
      <View style={[styles.stepContainer, { justifyContent: 'center' }]}>
        <Text style={[styles.resultTitle, { color: theme.text }]}>Votre Score SprintFlow</Text>
        
        <View style={{ width: '100%', marginBottom: 32, alignItems: 'center' }}>
          <Text style={{ fontSize: 48, fontWeight: '900', color: scoreResult.color, marginBottom: 12 }}>
            {scoreResult.score} <Text style={{ fontSize: 24, color: theme.icon }}>/ 100</Text>
          </Text>
          
          <View style={{ height: 12, width: '100%', backgroundColor: theme.border, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
            <View style={{ height: '100%', width: `${scoreResult.score}%`, backgroundColor: scoreResult.color, borderRadius: 6 }} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: 'bold', color: scoreResult.color, marginBottom: 8, textAlign: 'center' }}>
            {scoreResult.statusText}
          </Text>
          
          <Text style={{ fontSize: 16, color: theme.text, textAlign: 'center', opacity: 0.8, lineHeight: 22, paddingHorizontal: 10 }}>
            {getScoreMessage(scoreResult.score)}
          </Text>
        </View>
        
        <View style={[styles.summaryBox, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 12 }}>Résumé du jour :</Text>
          {scoreResult.summary.map((point, index) => (
            <View key={index} style={styles.summaryRow}>
              <MaterialIcons name="lens" size={8} color={theme.primary} style={{ marginRight: 8 }} />
              <Text style={{ color: theme.text }}>{point}</Text>
            </View>
          ))}
        </View>

        <CustomButton 
          title="Fermer" 
          onPress={() => router.back()} 
          style={{ width: '100%', marginTop: 40 }} 
        />
      </View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStepId) {
      case 'sleep': return renderSleep();
      case 'fatigue': return renderFatigue();
      case 'menstrual': return renderMenstrual();
      case 'pain_question': return renderPainQuestion();
      case 'body_map': return renderBodyMap();
      case 'pain_detail': return renderPainDetail();
      case 'result': return renderResult();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      
      <View style={styles.header}>
        {currentStepId !== 'sleep' && currentStepId !== 'result' ? (
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={28} color={theme.icon} />
          </TouchableOpacity>
        ) : <View style={styles.backBtnPlaceholder} />}
        
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <MaterialIcons name="close" size={28} color={theme.icon} />
        </TouchableOpacity>
      </View>

      {renderProgress()}

      <View style={styles.content}>
        {renderCurrentStep()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  backBtnPlaceholder: {
    width: 36,
  },
  closeBtn: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: Layout.spacing.lg,
    gap: 4,
    marginBottom: Layout.spacing.xl,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Layout.spacing.lg,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  questionText: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  valueDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  timeDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 16,
  },
  circleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  nextBtn: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: 40,
  },
  optionsContainer: {
    width: '100%',
    gap: 12,
  },
  optionBtn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: Typography.sizes.lg,
    fontWeight: '600',
  },
  rowOptions: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
  },
  halfBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  zoneTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: 'bold',
    marginBottom: 32,
    textTransform: 'uppercase',
  },
  subQuestionText: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  resultTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  scoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: Typography.sizes.lg,
    marginTop: -8,
  },
  statusText: {
    fontSize: Typography.sizes.xxl,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  summaryBox: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  }
});
