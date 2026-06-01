import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/useThemeColor';
import { useAthleteProfile } from '../../hooks/useAthleteProfile';
import { useAuth } from '../../providers/AuthProvider';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { MaterialIcons } from '@expo/vector-icons';
import { CustomButton } from '../../components/CustomButton';
import { useProfileMenu } from '../../config/profileMenu';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const sections = useProfileMenu();
  const { profile } = useAthleteProfile();
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth' as any);
  };
  
  let displayName = 'Utilisateur';
  if (profile.prenom) {
    displayName = profile.prenom;
    if (profile.nom) {
      displayName += ` ${profile.nom.charAt(0).toUpperCase()}.`;
    }
  } else if (profile.nom) {
    displayName = profile.nom;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title="Profil" />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* En-tête profil */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.surfaceSecondary, borderColor: theme.primary }]}>
            <MaterialIcons name="person" size={48} color={theme.icon} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{displayName}</Text>
          <Text style={[styles.email, { color: theme.icon }]}>{profile.email || 'Email non renseigné'}</Text>
        </View>

        {/* Sections de paramètres */}
        {sections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>{section.title}</Text>
            <View style={[styles.sectionContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {section.items.map((item, itemIdx) => (
                <View key={itemIdx}>
                  <TouchableOpacity style={styles.itemRow} onPress={item.onPress} disabled={!item.onPress && !item.right}>
                    <View style={styles.itemLeft}>
                      <MaterialIcons name={item.icon as any} size={24} color={theme.icon} style={styles.itemIcon} />
                      <Text style={[styles.itemLabel, { color: theme.text }]}>{item.label}</Text>
                    </View>
                    {item.right ? item.right : <MaterialIcons name="chevron-right" size={24} color={theme.icon} />}
                  </TouchableOpacity>
                  {itemIdx < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Actions de bas de page */}
        <View style={styles.bottomActions}>
          <CustomButton 
            title="Déconnexion" 
            variant="outline" 
            style={styles.actionBtn} 
            onPress={handleSignOut}
          />
          <CustomButton 
            title="Supprimer le compte" 
            variant="danger" 
            style={styles.actionBtn} 
            onPress={handleSignOut}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: Layout.spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
  },
  name: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  email: {
    fontSize: Typography.sizes.sm,
    marginTop: 4,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    textTransform: 'uppercase',
    marginBottom: Layout.spacing.sm,
    marginLeft: Layout.spacing.sm,
  },
  sectionContainer: {
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    marginRight: Layout.spacing.md,
  },
  itemLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  divider: {
    height: 1,
    marginLeft: 56, // Align with text
  },
  bottomActions: {
    marginTop: Layout.spacing.xl,
    marginBottom: Layout.spacing.xxl,
    gap: Layout.spacing.md,
  },
  actionBtn: {
    width: '100%',
  },
});
