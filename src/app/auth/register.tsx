import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { CustomButton } from '../../components/CustomButton';
import { Chip } from '../../components/Chip';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 7; // On passe de 9 à 7 étapes

const DISCIPLINES = [
  'Sprint', 'Haies', 'Demi-fond', 'Fond', 'Sauts', 'Lancers', 'Épreuves combinées'
];

const EPREUVES_BY_DISCIPLINE: Record<string, string[]> = {
  'Sprint': ['60m', '100m', '200m', '400m', 'Relais 4x100m', 'Relais 4x400m'],
  'Haies': ['60m haies', '100m haies', '110m haies', '400m haies'],
  'Demi-fond': ['800m', '1000m', '1500m', '3000m', '3000m steeple'],
  'Fond': ['5000m', '10000m', '5km route', '10km route', 'Semi-marathon', 'Marathon'],
  'Sauts': ['Longueur', 'Triple saut', 'Hauteur', 'Perche'],
  'Lancers': ['Poids', 'Disque', 'Marteau', 'Javelot'],
  'Épreuves combinées': ['Heptathlon', 'Décathlon', 'Pentathlon']
};

const GOALS = [
  'Battre mon record', 'Préparer une compétition', 'Reprendre l\'entraînement', 
  'Perdre du poids', 'Améliorer ma récupération'
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(2);
  const router = useRouter();
  const theme = useTheme();

  // Data State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cguAccepted, setCguAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [newsletterAccepted, setNewsletterAccepted] = useState(false);
  
  const [firstName, setFirstName] = useState('');
  const [mainDiscipline, setMainDiscipline] = useState('');
  const [epreuves, setEpreuves] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const nextStep = () => {
    if (step < 6) setStep(step + 1);
    else if (step === 6) createAccount();
  };

  const prevStep = () => {
    if (step > 2) setStep(step - 1);
    else router.back();
  };

  const toggleEpreuve = (e: string) => {
    if (epreuves.includes(e)) {
      setEpreuves(epreuves.filter(x => x !== e));
    } else {
      setEpreuves([...epreuves, e]);
    }
  };

  const toggleGoal = (g: string) => {
    if (goals.includes(g)) {
      setGoals(goals.filter(x => x !== g));
    } else {
      setGoals([...goals, g]);
    }
  };

  const createAccount = async () => {
    setStep(7); // Loading Screen
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      setStep(2); // Retour en cas d'erreur
      return;
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        role: 'athlete',
        firstName: firstName,
        mainDiscipline: mainDiscipline,
        mesDisciplines: epreuves,
        mainGoal: goals.join(', '), // On stocke les objectifs multiples séparés par une virgule
      });
    }

    // Le AuthProvider redirigera automatiquement vers /(tabs)
    setLoading(false);
  };

  const renderProgressBar = () => {
    // Étape 2 à 6 sont des étapes de formulaire (5 barres)
    const totalBars = 5;
    const currentBarIndex = step - 2;

    return (
      <View style={styles.progressBarContainer}>
        {Array.from({ length: totalBars }).map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.progressSegment, 
              { backgroundColor: i <= currentBarIndex ? theme.primary : theme.surface }
            ]} 
          />
        ))}
      </View>
    );
  };

  // ─── ÉCRANS ───
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Création du compte</Text>
      
      <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Adresse email"
          placeholderTextColor={theme.icon}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, marginTop: 16 }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Mot de passe (min. 6 car.)"
          placeholderTextColor={theme.icon}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <View style={{ marginTop: 32, gap: 16 }}>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setCguAccepted(!cguAccepted)}>
          <MaterialIcons name={cguAccepted ? "check-box" : "check-box-outline-blank"} size={24} color={cguAccepted ? theme.primary : theme.icon} />
          <Text style={[styles.checkboxText, { color: theme.text }]}>J'accepte les Conditions Générales d'Utilisation *</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setPrivacyAccepted(!privacyAccepted)}>
          <MaterialIcons name={privacyAccepted ? "check-box" : "check-box-outline-blank"} size={24} color={privacyAccepted ? theme.primary : theme.icon} />
          <Text style={[styles.checkboxText, { color: theme.text }]}>J'accepte la Politique de Confidentialité *</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setNewsletterAccepted(!newsletterAccepted)}>
          <MaterialIcons name={newsletterAccepted ? "check-box" : "check-box-outline-blank"} size={24} color={newsletterAccepted ? theme.primary : theme.icon} />
          <Text style={[styles.checkboxText, { color: theme.text }]}>J'accepte de recevoir les actualités BioAthlete</Text>
        </TouchableOpacity>
      </View>

      {errorMsg ? <Text style={{ color: '#F44336', marginTop: 16 }}>{errorMsg}</Text> : null}

      <View style={{ flex: 1 }} />
      <CustomButton
        title="Continuer"
        onPress={nextStep}
        disabled={!email || password.length < 6 || !cguAccepted || !privacyAccepted}
        style={{ width: '100%', marginBottom: 16 }}
      />
      <TouchableOpacity onPress={() => router.push('/auth')}>
        <Text style={{ color: theme.primary, textAlign: 'center', fontWeight: 'bold' }}>J'ai déjà un compte</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Comment devons-nous vous appeler ?</Text>
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, marginTop: 32 }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Exemple : Kleveens"
          placeholderTextColor={theme.icon}
          value={firstName}
          onChangeText={setFirstName}
        />
      </View>
      <View style={{ flex: 1 }} />
      <CustomButton title="Continuer" onPress={nextStep} disabled={!firstName} style={{ width: '100%' }} />
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Quelle est votre discipline principale ?</Text>
      <View style={styles.chipsContainer}>
        {DISCIPLINES.map(d => (
          <Chip 
            key={d} 
            label={d} 
            isSelected={mainDiscipline === d} 
            onPress={() => {
              setMainDiscipline(d);
              setEpreuves([]); // On réinitialise les épreuves si on change de discipline
            }} 
          />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <CustomButton title="Continuer" onPress={nextStep} disabled={!mainDiscipline} style={{ width: '100%' }} />
    </View>
  );

  const renderStep5 = () => {
    const availableEpreuves = mainDiscipline ? EPREUVES_BY_DISCIPLINE[mainDiscipline] : [];
    
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Quelles sont vos épreuves ?</Text>
        <Text style={[styles.subtitle, { color: theme.icon }]}>Sélection multiple (au moins une)</Text>
        <View style={styles.chipsContainer}>
          {availableEpreuves.map(e => (
            <Chip key={e} label={e} isSelected={epreuves.includes(e)} onPress={() => toggleEpreuve(e)} />
          ))}
        </View>
        <View style={{ flex: 1 }} />
        <CustomButton title="Continuer" onPress={nextStep} disabled={epreuves.length === 0} style={{ width: '100%' }} />
      </View>
    );
  };

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Quels sont vos objectifs ?</Text>
      <Text style={[styles.subtitle, { color: theme.icon }]}>Sélection multiple (au moins un)</Text>
      <View style={styles.verticalChips}>
        {GOALS.map(g => (
          <TouchableOpacity 
            key={g}
            style={[styles.verticalChip, { backgroundColor: goals.includes(g) ? theme.primary : theme.surface }]}
            onPress={() => toggleGoal(g)}
          >
            <Text style={{ color: goals.includes(g) ? '#fff' : theme.text, fontWeight: 'bold' }}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <CustomButton title="Continuer" onPress={nextStep} disabled={goals.length === 0} style={{ width: '100%' }} />
    </View>
  );

  const renderStep7 = () => (
    <View style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.title, { color: theme.text, marginTop: 24 }]}>Création du profil...</Text>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: theme.primary, fontSize: 40 }]}>Bienvenue {firstName}</Text>
          <Text style={[styles.subtitle, { color: theme.icon, marginTop: 8 }]}>BioAthlete est prêt.</Text>
          <CustomButton title="Commencer" onPress={() => router.replace('/(tabs)')} style={{ width: '100%', marginTop: 48 }} />
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {step < 7 && (
        <View style={styles.header}>
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
          {renderProgressBar()}
        </View>
      )}

      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
      {step === 7 && renderStep7()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  progressBarContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
    padding: Layout.spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    marginBottom: 16,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    padding: 16,
    fontSize: Typography.sizes.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxText: {
    fontSize: Typography.sizes.sm,
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  verticalChips: {
    gap: 12,
    marginTop: 24,
  },
  verticalChip: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
});
