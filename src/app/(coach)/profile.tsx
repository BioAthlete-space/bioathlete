import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useThemeColor';
import { CustomButton } from '../../components/CustomButton';
import { useAuth } from '../../providers/AuthProvider';
import { Header } from '../../components/Header';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth' as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Mon profil"  />
      <View style={styles.content}>
        <Text style={[styles.text, { color: theme.text }]}>Paramètres du coach</Text>
        
        <CustomButton 
          title="Se déconnecter" 
          onPress={handleSignOut} 
          style={{ marginTop: 40, width: '100%' }}
          variant="outline"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 16, fontWeight: 'bold' }
});
