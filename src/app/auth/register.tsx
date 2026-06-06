import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { CustomButton } from '../../components/CustomButton';
import { Chip } from '../../components/Chip';
import { WheelColumn } from '../../components/WheelColumn';

const { width } = Dimensions.get('window');

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

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
  'Battre mon record', 'Préparer une compétition', "Reprendre l'entraînement", 
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
  
  const [otpCode, setOtpCode] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [gender, setGender] = useState('Homme');
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState('Janvier');
  const [year, setYear] = useState(2000);
  const [height, setHeight] = useState(175);
  
  const [mainDiscipline, setMainDiscipline] = useState('');
  const [selectedEpreuves, setSelectedEpreuves] = useState<string[]>([]);
  const [mainGoal, setMainGoal] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // -- API Calls --
  const handleSignUp = async () => {
    if (!email || !password || !cguAccepted || !privacyAccepted) {
      setErrorMsg("Veuillez remplir tous les champs et accepter les conditions.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    } else {
      setStep(3); // Aller au code OTP
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 8) {
      setErrorMsg("Le code doit contenir 8 chiffres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup'
    });
    setLoading(false);
    if (error) {
      setErrorMsg("Code invalide ou expiré.");
    } else {
      setStep(4); // Aller au Nom
    }
  };

  const finalizeProfile = async () => {
    if (!mainGoal) return;
    setLoading(true);
    
    // Obtenir l'utilisateur courant (maintenant connecté grâce à l'OTP)
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Date format YYYY-MM-DD
      const monthIndex = MONTHS.indexOf(month) + 1;
      const formattedDate = `${year}-${monthIndex.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        role: 'athlete',
        email: email,
        firstname: firstName,
        lastname: lastName,
        gender: gender,
        birthdate: formattedDate,
        height_cm: height,
        maindiscipline: mainDiscipline,
        mesdisciplines: selectedEpreuves,
        maingoal: mainGoal,
      });
      
      if (error) {
        console.error(error);
        setErrorMsg("Erreur d'enregistrement du profil.");
      } else {
        setStep(11); // Success
      }
    }
    setLoading(false);
  };

  const nextStep = () => {
    setErrorMsg('');
    if (step === 2) {
      handleSignUp();
    } else if (step === 3) {
      handleVerifyOtp();
    } else if (step === 4) {
      if (!firstName || !lastName) { setErrorMsg("Veuillez renseigner votre nom et prénom."); return; }
      setStep(5);
    } else if (step === 7) {
      setStep(8);
    } else if (step === 8) {
      if (!mainDiscipline) return;
      setStep(9);
    } else if (step === 9) {
      if (selectedEpreuves.length === 0) return;
      setStep(10);
    } else if (step === 10) {
      finalizeProfile();
    } else {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setErrorMsg('');
    if (step > 2 && step < 11) {
      setStep(step - 1);
    } else if (step === 2) {
      router.back();
    }
  };

  const toggleEpreuve = (epreuve: string) => {
    if (selectedEpreuves.includes(epreuve)) {
      setSelectedEpreuves(prev => prev.filter(e => e !== epreuve));
    } else {
      setSelectedEpreuves(prev => [...prev, epreuve]);
    }
  };

  // --- RENDERS ---
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Créons ton compte 🚀</Text>
      
      <View style={styles.inputContainer}>
        <MaterialIcons name="email" size={20} color={theme.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Email"
          placeholderTextColor={theme.icon}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcons name="lock" size={20} color={theme.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Mot de passe"
          placeholderTextColor={theme.icon}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setCguAccepted(!cguAccepted)}>
        <MaterialIcons name={cguAccepted ? "check-box" : "check-box-outline-blank"} size={24} color={theme.primary} />
        <Text style={[styles.checkboxText, { color: theme.text }]}>J'accepte les CGU</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.checkboxRow} onPress={() => setPrivacyAccepted(!privacyAccepted)}>
        <MaterialIcons name={privacyAccepted ? "check-box" : "check-box-outline-blank"} size={24} color={theme.primary} />
        <Text style={[styles.checkboxText, { color: theme.text }]}>J'accepte la politique de confidentialité</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Confirme ton email</Text>
      <Text style={[styles.subtitle, { color: theme.icon }]}>Un code de sécurité à 8 chiffres t'a été envoyé.</Text>
      
      <View style={[styles.inputContainer, { justifyContent: 'center' }]}>
        <TextInput
          style={[styles.input, { color: theme.text, fontSize: 24, textAlign: 'center', letterSpacing: 8, padding: 10 }]}
          placeholder="••••••••"
          placeholderTextColor={theme.icon}
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          maxLength={8}
        />
      </View>
      <TouchableOpacity style={{ marginTop: 20 }} onPress={handleSignUp}>
         <Text style={{ color: theme.primary, textAlign: 'center' }}>Je n'ai pas reçu le mail, renvoyer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Quel est ton nom et prénom ?</Text>
      
      <View style={styles.inputContainer}>
        <MaterialIcons name="person" size={20} color={theme.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Prénom"
          placeholderTextColor={theme.icon}
          value={firstName}
          onChangeText={(val) => setFirstName(val.charAt(0).toUpperCase() + val.slice(1))}
        />
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcons name="person-outline" size={20} color={theme.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Nom de famille"
          placeholderTextColor={theme.icon}
          value={lastName}
          onChangeText={(val) => setLastName(val.toUpperCase())}
        />
      </View>
    </View>
  );

  const renderStep5 = () => {
    const genders = [{ label: 'Homme', value: 'Homme' }, { label: 'Femme', value: 'Femme' }];
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Quel est ton sexe ?</Text>
        <WheelColumn data={genders} value={gender} onChange={(v) => setGender(v as string)} />
      </View>
    );
  };

  const renderStep6 = () => {
    const days = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }));
    const months = MONTHS.map(m => ({ label: m, value: m }));
    const years = Array.from({ length: 70 }, (_, i) => ({ label: String(2025 - i), value: 2025 - i }));

    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Date de naissance</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', height: 200 }}>
          <View style={{ flex: 1 }}><WheelColumn data={days} value={day} onChange={(v) => setDay(v as number)} /></View>
          <View style={{ flex: 1 }}><WheelColumn data={months} value={month} onChange={(v) => setMonth(v as string)} /></View>
          <View style={{ flex: 1 }}><WheelColumn data={years} value={year} onChange={(v) => setYear(v as number)} /></View>
        </View>
      </View>
    );
  };

  const renderStep7 = () => {
    const heightsData = Array.from({ length: 151 }, (_, i) => ({ label: `${i + 100} cm`, value: i + 100 }));
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Quelle est ta taille ?</Text>
        <View style={{ height: 200 }}>
           <WheelColumn data={heightsData} value={height} onChange={(v) => setHeight(v as number)} />
        </View>
      </View>
    );
  };

  const renderStep8 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Quelle est ta discipline principale ?</Text>
      <View style={styles.chipsContainer}>
        {DISCIPLINES.map(d => (
          <Chip key={d} label={d} isSelected={mainDiscipline === d} onPress={() => { setMainDiscipline(d); setSelectedEpreuves([]); }} />
        ))}
      </View>
    </View>
  );

  const renderStep9 = () => {
    const availableEpreuves = EPREUVES_BY_DISCIPLINE[mainDiscipline] || [];
    return (
      <View style={styles.stepContainer}>
        <Text style={[styles.title, { color: theme.text }]}>Quelles sont tes épreuves ?</Text>
        <View style={styles.chipsContainer}>
          {availableEpreuves.map(e => (
            <Chip key={e} label={e} isSelected={selectedEpreuves.includes(e)} onPress={() => toggleEpreuve(e)} />
          ))}
        </View>
      </View>
    );
  };

  const renderStep10 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.title, { color: theme.text }]}>Quel est ton objectif principal ?</Text>
      <View style={styles.chipsContainer}>
        {GOALS.map(g => (
          <Chip key={g} label={g} isSelected={mainGoal === g} onPress={() => setMainGoal(g)} />
        ))}
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: theme.primary + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
         <MaterialIcons name="directions-run" size={64} color={theme.primary} />
      </View>
      <Text style={[styles.title, { color: theme.text, textAlign: 'center', fontSize: 32 }]}>Wahou, {firstName} !</Text>
      <Text style={[styles.subtitle, { color: theme.icon, textAlign: 'center', fontSize: 16 }]}>
        Ton profil est prêt. C'est parti pour exploser tes chronos.
      </Text>
      <CustomButton title="Aller à l'accueil" onPress={() => router.replace('/(tabs)')} style={{ marginTop: 40, width: '100%' }} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {step < 11 && (
        <View style={styles.header}>
          <TouchableOpacity onPress={prevStep} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={28} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: theme.card }]}>
              <Animated.View style={[styles.progressFill, { width: `${((step - 1) / 9) * 100}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
        {step === 7 && renderStep7()}
        {step === 8 && renderStep8()}
        {step === 9 && renderStep9()}
        {step === 10 && renderStep10()}
        {step === 11 && renderSuccess()}
      </ScrollView>

      {step < 11 && (
        <View style={[styles.footer, { backgroundColor: theme.background }]}>
          <CustomButton 
            title={loading ? "Chargement..." : "Continuer"} 
            onPress={nextStep}
            disabled={loading}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60 },
  backButton: { padding: 8, marginRight: 12 },
  progressContainer: { flex: 1 },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  
  scrollContent: { padding: 24, paddingBottom: 100 },
  stepContainer: { flex: 1 },
  
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, fontFamily: Typography.weights.bold },
  subtitle: { fontSize: 16, marginBottom: 32 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(128,128,128,0.2)', borderRadius: Layout.borderRadius.lg, padding: 16, marginBottom: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16 },
  
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkboxText: { marginLeft: 12, fontSize: 14 },
  
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  
  footer: { padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.1)' },
  
  errorText: { color: '#FF3B30', marginBottom: 16, textAlign: 'center' }
});
