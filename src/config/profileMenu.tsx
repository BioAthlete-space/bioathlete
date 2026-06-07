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
      title: 'Mon Profil',
      items: [
        { label: 'Informations personnelles', icon: 'person-outline', onPress: () => router.push('/profile/account') },
        { label: 'Mon profil athlétique / Mes objectifs', icon: 'ads-click', onPress: () => router.push('/profile/goals') },
        { label: 'Régime alimentaire', icon: 'restaurant', right: <Text style={{ color: theme.icon }}>Aucun</Text>, onPress: () => {} },
      ],
    },
    {
      title: 'Écosystème BioAthlete',
      items: [
        { label: 'Mon groupe', icon: 'groups', onPress: () => router.push('/profile/group') },
        { label: 'Mon Coach LLM', icon: 'smart-toy', onPress: () => router.push('/profile/coach') },
        { label: 'Appareils connectés', icon: 'watch', onPress: () => router.push('/profile/devices') },
      ],
    },
    {
      title: 'Paramètres de l\'application',
      items: [
        { label: 'Langue', icon: 'language', right: <Text style={{ color: theme.icon }}>Français</Text>, onPress: () => {} },
        { label: 'Thème sombre', icon: 'dark-mode', right: <Switch value={true} disabled /> },
      ],
    },
    {
      title: 'Aide & Informations',
      items: [
        { label: 'Aide et support', icon: 'support-agent', onPress: () => router.push('/profile/support') },
        { label: 'Mentions légales & Confidentialité', icon: 'gavel', onPress: () => router.push('/profile/legal') },
      ],
    },
  ];
}
