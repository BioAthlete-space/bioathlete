import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';

export default function LibraryScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Bibliothèque</Text>
      <Text style={{ color: theme.icon, marginTop: 16 }}>Gérez vos modèles de séances et d'exercices ici.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Layout.spacing.xl,
    paddingTop: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
});
