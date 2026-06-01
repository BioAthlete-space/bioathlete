import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions, SafeAreaView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../hooks/useThemeColor';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';
import { CustomButton } from '../components/CustomButton';
import { Chip } from '../components/Chip';
import { CheckinData, PainDetail, SleepQuality, WakeupFeeling, PainType } from '../types/Checkin';
import { calculateSprintFlowScore, ScoreResult } from '../utils/SprintFlowScore';
import { saveCheckin } from '../services/StorageService';

const { width } = Dimensions.get('window');

const STEPS = [
  'SOMMEIL',
  'QUALITÉ SOMMEIL',
  'RÉVEIL',
  'MOTIVATION',
  'FATIGUE',
  'DOULEURS',
  'BODY MAP',
  'DÉTAIL DOULEUR',
  'RÉSULTAT'
];

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

  const [currentStep, setCurrentStep] = useState(0);
  
  // Data State
  const [sleepHours, setSleepHours] = useState<number>(8);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null);
  const [wakeupFeeling, setWakeupFeeling] = useState<WakeupFeeling | null>(null);
  const [motivation, setMotivation] = useState<number>(7);
  const [fatigue, setFatigue] = useState<number>(3);
  const [hasPain, setHasPain] = useState<boolean | null>(null);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  
  // Pain details
  const [painDetails, setPainDetails] = useState<PainDetail[]>([]);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);

  // Result
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);

  // Computed total steps for progress bar
  // If hasPain is false, we skip BODY MAP and DÉTAIL DOULEUR
  const totalSteps = hasPain === false ? 7 : STEPS.length;

  const nextStep = () => {
    if (currentStep === 5) { // DOULEURS
      if (hasPain === false) {
        calculateAndFinish();
        setCurrentStep(8); // RÉSULTAT
        return;
      }
    }
    
    if (currentStep === 6) { // BODY MAP
      if (selectedZones.length === 0) {
        Alert.alert('Attention', 'Veuillez sélectionner au moins une zone ou revenir en arrière pour indiquer "Non" aux douleurs.');
        return;
      }
      // Initialize pain details array based on selected zones
      setPainDetails(selectedZones.map(zone => ({ zone, intensity: 5, type: 'Courbatures' })));
      setCurrentZoneIndex(0);
    }
    
    if (currentStep === 7) { // DÉTAIL DOULEUR
      if (currentZoneIndex < selectedZones.length - 1) {
        setCurrentZoneIndex(prev => prev + 1);
        return; // Don't advance the main step yet
      } else {
        calculateAndFinish();
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep === 7) { // DÉTAIL DOULEUR
      if (currentZoneIndex > 0) {
        setCurrentZoneIndex(prev => prev - 1);
        return; // Don't go back a main step
      }
    }
    
    if (currentStep === 8 && hasPain === false) {
      setCurrentStep(5);
      return;
    }

    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const calculateAndFinish = async () => {
    const data: Partial<CheckinData> = {
      sleepHours,
      sleepQuality: sleepQuality as SleepQuality,
      wakeupFeeling: wakeupFeeling as WakeupFeeling,
      motivation,
      fatigue,
      hasPain: hasPain as boolean,
      painDetails: hasPain ? painDetails : [],
    };

    const result = calculateSprintFlowScore(data);
    setScoreResult(result);

    // Save to storage
    const today = new Date();
    const checkinId = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    
    const finalData: CheckinData = {
      id: checkinId,
      date: today.toISOString(),
      sleepHours,
      sleepQuality: sleepQuality as SleepQuality,
      wakeupFeeling: wakeupFeeling as WakeupFeeling,
      motivation,
      fatigue,
      hasPain: hasPain as boolean,
      painDetails: hasPain ? painDetails : [],
      score: result.score
    };

    await saveCheckin(finalData);
  };

  // --- RENDERERS FOR STEPS ---

  const renderProgress = () => {
    if (currentStep === 8) return null; // No progress on result page

    return (
      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps - 1 }).map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.progressSegment, 
              { backgroundColor: i <= currentStep ? theme.primary : theme.border }
            ]} 
          />
        ))}
      </View>
    );
  };

  const renderStep0 = () => ( // SOMMEIL
    <View style={styles.stepContainer}>
      <Text style={[styles.questionText, { color: theme.text }]}>Combien d'heures avez-vous dormi ?</Text>
      <Text style={[styles.valueDisplay, { color: theme.primary }]}>{sleepHours} h</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={12}
        step={0.5}
        value={sleepHours}
        onValueChange={setSleepHours}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
      />
      <View style={styles.sliderLabels}>
        <Text style={{ color: theme.icon }}>0h</Text>
        <Text style={{ color: theme.icon }}>12h</Text>
      </View>
      <CustomButton title="Continuer" onPress={nextStep} style={styles.nextBtn} />
    </View>
  );

  const renderStep1 = () => { // QUALITÉ SOMMEIL
    const options: SleepQuality[] = ['Très mauvais', 'Mauvais', 'Moyen', 'Bon', 'Excellent'];
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.questionText, { color: theme.text }]}>Comment jugez-vous votre sommeil ?</Text>
        <View style={styles.optionsContainer}>
          {options.map(opt => (
            <TouchableOpacity 
              key={opt}
              style={[
                styles.optionBtn, 
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                sleepQuality === opt && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => { setSleepQuality(opt); setTimeout(nextStep, 300); }}
            >
              <Text style={[
                styles.optionText, 
                { color: theme.text },
                sleepQuality === opt && { color: '#FFF' }
              ]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStep2 = () => { // RÉVEIL
    const options: WakeupFeeling[] = ['Épuisé', 'Fatigué', 'Moyen', 'Bien', 'Très bien'];
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.questionText, { color: theme.text }]}>Comment vous sentez-vous au réveil ?</Text>
        <View style={styles.optionsContainer}>
          {options.map(opt => (
            <TouchableOpacity 
              key={opt}
              style={[
                styles.optionBtn, 
                { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
                wakeupFeeling === opt && { backgroundColor: theme.primary, borderColor: theme.primary }
              ]}
              onPress={() => { setWakeupFeeling(opt); setTimeout(nextStep, 300); }}
            >
              <Text style={[
                styles.optionText, 
                { color: theme.text },
                wakeupFeeling === opt && { color: '#FFF' }
              ]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderStep3 = () => ( // MOTIVATION
    <View style={styles.stepContainer}>
      <Text style={[styles.questionText, { color: theme.text }]}>Votre motivation pour l'entraînement aujourd'hui ?</Text>
      <Text style={[styles.valueDisplay, { color: theme.primary }]}>{motivation} / 10</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={motivation}
        onValueChange={setMotivation}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
      />
      <View style={styles.sliderLabels}>
        <Text style={{ color: theme.icon }}>0 (Nulle)</Text>
        <Text style={{ color: theme.icon }}>10 (Max)</Text>
      </View>
      <CustomButton title="Continuer" onPress={nextStep} style={styles.nextBtn} />
    </View>
  );

  const renderStep4 = () => ( // FATIGUE
    <View style={styles.stepContainer}>
      <Text style={[styles.questionText, { color: theme.text }]}>Niveau de fatigue générale ?</Text>
      <Text style={[styles.valueDisplay, { color: theme.primary }]}>{fatigue} / 10</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={10}
        step={1}
        value={fatigue}
        onValueChange={setFatigue}
        minimumTrackTintColor={theme.primary}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.primary}
      />
      <View style={styles.sliderLabels}>
        <Text style={{ color: theme.icon }}>0 (En pleine forme)</Text>
        <Text style={{ color: theme.icon }}>10 (Épuisé)</Text>
      </View>
      <CustomButton title="Continuer" onPress={nextStep} style={styles.nextBtn} />
    </View>
  );

  const renderStep5 = () => ( // DOULEURS OUI/NON
    <View style={styles.stepContainer}>
      <Text style={[styles.questionText, { color: theme.text }]}>Avez-vous des douleurs aujourd'hui ?</Text>
      <View style={styles.rowOptions}>
        <TouchableOpacity 
          style={[
            styles.halfBtn, 
            { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
            hasPain === false && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => { setHasPain(false); setTimeout(nextStep, 300); }}
        >
          <Text style={[styles.optionText, { color: theme.text }, hasPain === false && { color: '#FFF' }]}>Non</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.halfBtn, 
            { backgroundColor: theme.surfaceSecondary, borderColor: theme.border },
            hasPain === true && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => { setHasPain(true); setTimeout(nextStep, 300); }}
        >
          <Text style={[styles.optionText, { color: theme.text }, hasPain === true && { color: '#FFF' }]}>Oui</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep6 = () => { // BODY MAP
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
           {/* Fallback simple au lieu d'un vrai SVG : des pastilles organisées logiquement */}
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

  const renderStep7 = () => { // DÉTAIL DOULEUR
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
        <Text style={[styles.valueDisplay, { color: theme.primary, fontSize: 24, marginVertical: 8 }]}>{currentPain.intensity} / 10</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={10}
          step={1}
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

  const renderStep8 = () => { // RÉSULTAT
    if (!scoreResult) return null;

    return (
      <View style={[styles.stepContainer, { justifyContent: 'center' }]}>
        <Text style={[styles.resultTitle, { color: theme.text }]}>Votre Score SprintFlow</Text>
        
        <View style={[styles.scoreCircle, { borderColor: scoreResult.color }]}>
          <Text style={[styles.scoreNumber, { color: scoreResult.color }]}>{scoreResult.score}</Text>
          <Text style={[styles.scoreMax, { color: theme.icon }]}>/ 100</Text>
        </View>

        <Text style={[styles.statusText, { color: scoreResult.color }]}>{scoreResult.statusText}</Text>
        
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
    switch (currentStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />
      
      <View style={styles.header}>
        {currentStep > 0 && currentStep < 8 ? (
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
    fontWeight: Typography.weights.bold as any,
    textAlign: 'center',
    marginBottom: 40,
  },
  valueDisplay: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 40,
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
