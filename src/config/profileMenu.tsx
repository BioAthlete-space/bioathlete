import React from 'react';
import { Text, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useThemeColor';

export interface ProfileMenuItem {
  label: string;
  icon: string;
  right?: React.ReactNode;
  onPress?: () => void;
}

export interface ProfileMenuSection {
  title: string;
  items: ProfileMenuItem[];
}

export function useProfileMenu(): ProfileMenuSection[] {
  const theme = useTheme();
  const router = useRouter();

  return [
    {
      title: 'Compte',
      items: [
        { label: 'Mon compte', icon: 'person-outline', onPress: () => router.push('/profile/account') },
        { label: 'Mon groupe', icon: 'groups', onPress: () => router.push('/profile/group') },
        { label: 'Mon Coach LLM', icon: 'smart-toy', onPress: () => router.push('/profile/coach') },
        { label: 'Appareils connectés', icon: 'watch' },
        { label: 'Modifier le mot de passe', icon: 'lock-outline' },
      ],
    },
    {
      title: 'Nutrition',
      items: [
        { label: 'Mes objectifs', icon: 'ads-click', onPress: () => router.push('/profile/goals') },
        { label: 'Régime alimentaire', icon: 'restaurant', right: <Text style={{ color: theme.icon }}>Aucun</Text> },
      ],
    },
    {
      title: 'Préférences',
      items: [
        { label: 'Langue', icon: 'language', right: <Text style={{ color: theme.icon }}>Français</Text> },
        { label: 'Thème sombre', icon: 'dark-mode', right: <Switch value={true} /> },
      ],
    },
    {
      title: 'Aide',
      items: [
        { label: 'FAQ', icon: 'help-outline' },
        { label: 'Besoin d\'aide', icon: 'support-agent' },
        { label: 'Signaler un problème', icon: 'report-problem' },
      ],
    },
    {
      title: 'À propos',
      items: [
        { label: 'CGU', icon: 'description' },
        { label: 'Mentions légales', icon: 'gavel' },
        { label: 'Politique de confidentialité', icon: 'privacy-tip' },
      ],
    },
  ];
}
