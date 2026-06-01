import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useThemeColor';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from 'expo-router';

export default function CoachScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Espace Coach</Text>
      
      {/* Bouton de secours pour pouvoir se dÃ©connecter */}
      <CustomButton 
        title="Se dÃ©connecter" 
        onPress={handleSignOut} 
        style={{ marginTop: 40 }} 
        variant="outline"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
});
