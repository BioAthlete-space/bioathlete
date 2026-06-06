import React, { useState } from 'react';
import { Text, Switch, View, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../hooks/useThemeColor';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { Layout } from '../constants/Layout';
import { Typography } from '../constants/Typography';

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

const BASE_URL = 'https://bioathlete.space';

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
        { label: 'Appareils connectés', icon: 'watch', onPress: () => router.push('/profile/devices') },
        { label: 'Modifier le mot de passe', icon: 'lock-outline', onPress: () => router.push('/profile/password') },
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
        { label: 'Langue', icon: 'language', right: <Text style={{ color: theme.icon }}>Français</Text>, onPress: () => {} },
        { label: 'Thème sombre', icon: 'dark-mode', right: <Switch value={true} /> },
      ],
    },
    {
      title: 'Aide',
      items: [
        { label: 'FAQ', icon: 'help-outline', onPress: () => router.push('/faq') },
        { label: "Besoin d'aide", icon: 'support-agent', onPress: () => router.push('/support') },
        { label: 'Signaler un problème', icon: 'report-problem', onPress: () => router.push('/support') },
      ],
    },
    {
      title: 'À propos',
      items: [
        { label: 'CGU', icon: 'description', onPress: () => router.push('/cgu') },
        { label: 'Mentions légales', icon: 'gavel', onPress: () => router.push('/mentions-legales') },
        { label: 'Politique de confidentialité', icon: 'privacy-tip', onPress: () => router.push('/confidentialite') },
      ],
    },
  ];
}
