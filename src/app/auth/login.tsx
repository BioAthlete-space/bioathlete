import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useFonts, Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { CustomButton } from '../../components/CustomButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
  });

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      Alert.alert('Erreur', error.message);
    }
    setLoading(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: '', headerShadowVisible: false, headerStyle: { backgroundColor: theme.background } }} />
      
      <Text style={[styles.title, { color: '#000000', fontFamily: fontsLoaded ? 'Montserrat_300Light' : undefined, fontWeight: '300' }]}>
        Connexion
      </Text>
      <Text style={[styles.subtitle, { color: theme.text }]}>Heureux de vous revoir</Text>
      
      <View style={[styles.inputContainer, { backgroundColor: theme.surface }]}>
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
      
      <View style={[styles.inputContainer, { backgroundColor: theme.surface, marginTop: 16 }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Mot de passe"
          placeholderTextColor={theme.icon}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 12 }}>
        <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Mot de passe oublié ?</Text>
      </TouchableOpacity>

      <CustomButton
        title={loading ? "Connexion..." : "Se connecter"}
        onPress={signInWithEmail}
        disabled={loading || !email || !password}
        style={{ marginTop: 24, width: '100%' }}
      />

      <View style={styles.dividerContainer}>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Text style={[styles.dividerText, { color: theme.icon }]}>ou</Text>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
      </View>

      <TouchableOpacity style={[styles.socialBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <FontAwesome name="google" size={20} color={theme.text} style={styles.socialIcon} />
        <Text style={[styles.socialText, { color: theme.text }]}>Continuer avec Google</Text>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <TouchableOpacity style={[styles.socialBtn, { backgroundColor: theme.text, borderColor: theme.text, marginTop: 12 }]}>
          <FontAwesome name="apple" size={20} color={theme.background} style={styles.socialIcon} />
          <Text style={[styles.socialText, { color: theme.background }]}>Continuer avec Apple</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.push('/auth/register')} style={{ marginTop: 32 }}>
        <Text style={{ color: theme.text, textAlign: 'center' }}>
          Pas encore de compte ? <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Créer un compte</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.xl,
    paddingTop: Layout.spacing.md, // Ajustement car le header prend un peu de place
  },
  title: {
    fontSize: 40,
    fontWeight: '300',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    marginBottom: 40,
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontWeight: 'bold',
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  socialIcon: {
    position: 'absolute',
    left: 20,
  },
  socialText: {
    fontSize: Typography.sizes.md,
    fontWeight: 'bold',
  },
});
