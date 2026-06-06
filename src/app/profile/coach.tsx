import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';

import { BioflowLogo } from '../../components/BioflowLogo';
import { bioflowStore } from '../../stores/BioflowStore';

export default function CoachLLMScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [inputText, setInputText] = useState('');

  const quickActions = [
    "Analyse ma séance",
    "Analyse ma nutrition",
    "Conseil sprint",
    "Préparation compétition",
    "Analyse récupération",
    "Motivation"
  ];

  const handleSend = () => {
    if (!inputText.trim()) return;
    bioflowStore.trigger('thinking');
    // simulation de réponse
    setTimeout(() => {
      bioflowStore.trigger('success');
      setInputText('');
    }, 2000);
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Header 
        title="Bioflow IA" 
        leftContent={
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Welcome Message */}
        <View style={styles.welcomeContainer}>
          <View style={styles.botIcon}>
            <BioflowLogo size={80} />
          </View>
          <Text style={[styles.welcomeText, { color: theme.text }]}>
            Bonjour ! Je suis Bioflow, votre IA personnalisée. Comment puis-je vous aider aujourd'hui ?
          </Text>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.icon }]}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.actionBadge, { backgroundColor: theme.surfaceSecondary, borderColor: theme.border }]}
            >
              <Text style={[styles.actionText, { color: theme.primary }]}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceSecondary }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Posez votre question au coach..."
            placeholderTextColor={theme.icon}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
        </View>
        <TouchableOpacity 
          style={[styles.sendButton, { backgroundColor: inputText.length > 0 ? theme.primary : theme.border }]}
          disabled={inputText.length === 0}
          onPress={handleSend}
        >
          <MaterialIcons name="send" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backBtn: {
    padding: Layout.spacing.sm,
    marginLeft: -Layout.spacing.sm,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xl,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xxl,
  },
  botIcon: {
    marginBottom: Layout.spacing.md,
  },
  welcomeText: {
    fontSize: Typography.sizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    textTransform: 'uppercase',
    fontWeight: Typography.weights.bold,
    marginBottom: Layout.spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
  },
  actionBadge: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.pill,
    borderWidth: 1,
  },
  actionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: Layout.borderRadius.xl,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    minHeight: 48,
    maxHeight: 120,
    marginRight: Layout.spacing.sm,
  },
  input: {
    fontSize: Typography.sizes.md,
    paddingTop: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
