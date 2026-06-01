import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, Platform, Animated, TextInput, Alert, TouchableOpacity } from 'react-native';
import { createElement } from 'react'; // React natif pour le web
import { useRouter } from 'expo-router';
import { useFonts, Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { CustomButton } from '../../components/CustomButton';
import { supabase } from '../../lib/supabase';

export default function WelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const shiftAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleShowLogin = () => {
    setShowLogin(true);
    Animated.parallel([
      Animated.timing(shiftAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handleHideLogin = () => {
    Animated.parallel([
      Animated.timing(shiftAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowLogin(false);
    });
  };

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Erreur', error.message);
    else router.replace('/(tabs)');
  }

  const translateY = shiftAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -60] // Décale beaucoup moins vers le haut, pour que le logo reste plus bas
  });

  useEffect(() => {
    if (Platform.OS === 'web' && !document.getElementById('shine-style')) {
      const style = document.createElement('style');
      style.id = 'shine-style';
      style.textContent = `
        @keyframes shine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        .shine-text {
          background: linear-gradient(120deg, #000 35%, #999 50%, #000 65%);
          background-size: 200% auto;
          color: #000;
          background-clip: text;
          text-fill-color: transparent;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine 4s linear infinite;
          display: inline-block;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [fontsLoaded] = useFonts({
    Montserrat_300Light,
  });

  if (!fontsLoaded) {
    return null; // ou un splash screen/spinner
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', transform: [{ translateY }] }}>
        <View style={styles.logoContainer}>
          <Image 
            source={{ uri: 'https://nmmqkaljsjualnjlzyfw.supabase.co/storage/v1/object/public/Logo-s/PhotoRoom-20260504_162240.png' }} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>

        {Platform.OS === 'web' ? (
          createElement('span', { 
            className: 'shine-text', 
            style: { fontFamily: 'Montserrat_300Light', fontSize: '40px', fontWeight: '300', marginBottom: '16px', textAlign: 'center', display: 'block' } 
          }, 'BioAthlete')
        ) : (
          <Text style={[styles.title, { color: '#000000', fontFamily: 'Montserrat_300Light' }]}>
            BioAthlete
          </Text>
        )}

        <View style={{ width: '100%', alignItems: 'center', marginTop: 8, minHeight: 250 }}>
          {/* Sous-titre original qui s'efface */}
          <Animated.Text style={[styles.subtitle, { 
            color: theme.icon, 
            position: 'absolute',
            opacity: shiftAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
          }]}>
            Chaque séance compte.
          </Animated.Text>

          {/* Formulaire de connexion qui apparaît à la place */}
          {showLogin && (
            <Animated.View style={{ opacity: fadeAnim, width: '100%', position: 'absolute', top: 64, paddingHorizontal: Layout.spacing.xl }}>
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
              
              <CustomButton 
                title={loading ? "Connexion..." : "Se connecter"} 
                onPress={signInWithEmail} 
                style={{ width: '100%', marginTop: 24 }} 
                disabled={loading}
              />
              
              <TouchableOpacity onPress={handleHideLogin} style={{ marginTop: 24, alignItems: 'center' }}>
                <Text style={{ color: theme.icon, fontSize: 14 }}>Annuler</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {/* Boutons originaux */}
        <Animated.View style={{ opacity: shiftAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), pointerEvents: showLogin ? 'none' : 'auto' }}>
          <CustomButton
            title="Créer un compte"
            onPress={() => router.push('/auth/register')}
            style={{ width: '100%', marginBottom: 16 }}
          />
          <CustomButton
            title="Se connecter"
            onPress={handleShowLogin}
            variant="outline"
            style={{ width: '100%', marginBottom: 24, borderColor: theme.border }}
            textStyle={{ color: theme.text }}
          />
          
          <Text style={[styles.coachText, { color: theme.icon }]} onPress={() => router.push('/auth/register-coach')}>
            Vous êtes un coach ? <Text style={{ color: theme.primary, fontWeight: 'bold' }}>Par ici</Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 40,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: Typography.sizes.lg,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    padding: Layout.spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : Layout.spacing.xl,
    alignItems: 'center',
  },
  coachText: {
    textAlign: 'center',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    height: 56,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
});
