import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';

const COLORS = [
  { name: 'Noir profond', value: '#000000' },
  { name: 'Gris anthracite', value: '#1F2937' },
  { name: 'Gris foncé', value: '#4B5563' },
];

const SLOGANS = [
  'Construisez votre prochaine performance.',
  'Chaque séance compte.',
  'Progressez. Analysez. Performez.',
  'Votre performance commence ici.'
];

const FONTS = [
  { id: 'Inter', regular: 'Inter', semiBold: 'Inter', bold: 'Inter' },
  { id: 'Manrope', regular: 'Manrope', semiBold: 'Manrope', bold: 'Manrope' },
  { id: 'Plus Jakarta Sans', regular: '"Plus Jakarta Sans"', semiBold: '"Plus Jakarta Sans"', bold: '"Plus Jakarta Sans"' },
  { id: 'Montserrat', regular: 'Montserrat', semiBold: 'Montserrat', bold: 'Montserrat' }
];

export default function BrandTestScreen() {
  const [fontsLoaded, setFontsLoaded] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Manrope:wght@400;600;800&family=Montserrat:wght@400;600;800&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
      `;
      document.head.appendChild(style);
      // Small delay to let browser parse the fonts
      setTimeout(() => setFontsLoaded(true), 500);
    }
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const renderCard = (font: any, color: any, slogan: string) => {
    return (
      <View style={styles.gridContainer}>
        {/* Version A */}
        <View style={styles.card}>
          <Text style={styles.versionLabel}>Version A (Majuscule espacée)</Text>
          <Image source={{ uri: 'https://nmmqkaljsjualnjlzyfw.supabase.co/storage/v1/object/public/Logo-s/PhotoRoom-20260504_162240.png' }} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.titleA, { fontFamily: font.bold, fontWeight: '800', color: color.value }]}>SPRINTFLOW</Text>
          <Text style={[styles.slogan, { fontFamily: font.regular, fontWeight: '400', color: '#6B7280' }]}>{slogan}</Text>
        </View>

        {/* Version B */}
        <View style={styles.card}>
          <Text style={styles.versionLabel}>Version B (Minimaliste Léger)</Text>
          <Image source={{ uri: 'https://nmmqkaljsjualnjlzyfw.supabase.co/storage/v1/object/public/Logo-s/PhotoRoom-20260504_162240.png' }} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.titleB, { fontFamily: font.regular, fontWeight: '400', color: color.value }]}>SprintFlow</Text>
          <Text style={[styles.slogan, { fontFamily: font.regular, fontWeight: '400', color: '#6B7280' }]}>{slogan}</Text>
        </View>

        {/* Version C */}
        <View style={styles.card}>
          <Text style={styles.versionLabel}>Version C (Premium Medium)</Text>
          <Image source={{ uri: 'https://nmmqkaljsjualnjlzyfw.supabase.co/storage/v1/object/public/Logo-s/PhotoRoom-20260504_162240.png' }} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.titleC, { fontFamily: font.semiBold, fontWeight: '600', color: color.value }]}>SprintFlow</Text>
          <Text style={[styles.slogan, { fontFamily: font.regular, fontWeight: '400', color: '#6B7280' }]}>{slogan}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.mainTitle}>Laboratoire d'Identité Visuelle</Text>
      
      {FONTS.map(font => (
        <View key={font.id} style={styles.section}>
          <Text style={styles.sectionTitle}>Police : {font.id}</Text>
          
          {COLORS.map(color => (
            <View key={color.name} style={styles.colorSection}>
              <Text style={styles.colorTitle}>Couleur : {color.name}</Text>
              
              {SLOGANS.map(slogan => (
                <View key={slogan} style={styles.sloganSection}>
                  {renderCard(font, color, slogan)}
                </View>
              ))}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 40,
    color: '#111827',
  },
  section: {
    marginBottom: 60,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: 20,
    marginBottom: 20,
    color: '#000',
  },
  colorSection: {
    marginBottom: 40,
  },
  colorTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 16,
    color: '#374151',
  },
  sloganSection: {
    marginBottom: 24,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  versionLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 24,
    fontWeight: 'bold',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  titleA: {
    fontSize: 22,
    letterSpacing: 4,
    marginBottom: 12,
  },
  titleB: {
    fontSize: 28,
    marginBottom: 12,
  },
  titleC: {
    fontSize: 28,
    marginBottom: 12,
  },
  slogan: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
