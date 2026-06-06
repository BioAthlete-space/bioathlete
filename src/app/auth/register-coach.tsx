import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { CustomButton } from '../../components/CustomButton';

export default function RegisterCoachScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [cguAccepted, setCguAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const theme = useTheme();

  const createCoachAccount = async () => {
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        role: 'coach',
        firstname: firstName,
        lastname: lastName,
      });
    }

    // AuthProvider gère la redirection vers /(coach)
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.primary }]}>Espace Coach</Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>Créez votre compte entraîneur</Text>
      
      <View style={{ gap: 16, marginTop: 16 }}>
        <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Prénom"
            placeholderTextColor={theme.icon}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Nom"
            placeholderTextColor={theme.icon}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

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
        
        <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Mot de passe (min. 6 car.)"
            placeholderTextColor={theme.icon}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <View style={{ marginTop: 32, gap: 16 }}>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setCguAccepted(!cguAccepted)}>
          <MaterialIcons name={cguAccepted ? "check-box" : "check-box-outline-blank"} size={24} color={cguAccepted ? theme.primary : theme.icon} />
          <Text style={[styles.checkboxText, { color: theme.text }]}>J'accepte les CGU *</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.checkboxRow} onPress={() => setPrivacyAccepted(!privacyAccepted)}>
          <MaterialIcons name={privacyAccepted ? "check-box" : "check-box-outline-blank"} size={24} color={privacyAccepted ? theme.primary : theme.icon} />
          <Text style={[styles.checkboxText, { color: theme.text }]}>J'accepte la Politique de Confidentialité *</Text>
        </TouchableOpacity>
      </View>

      {errorMsg ? <Text style={{ color: '#F44336', marginTop: 16 }}>{errorMsg}</Text> : null}

      <CustomButton
        title={loading ? "Création..." : "S'inscrire comme Coach"}
        onPress={createCoachAccount}
        disabled={loading || !email || password.length < 6 || !firstName || !cguAccepted || !privacyAccepted}
        style={{ marginTop: 32, width: '100%' }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: Layout.spacing.xl,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 40,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.sizes.xl,
    marginBottom: 24,
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
});
