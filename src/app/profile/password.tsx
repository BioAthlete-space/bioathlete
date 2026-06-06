import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useThemeColor';
import { Layout } from '../../constants/Layout';
import { Typography } from '../../constants/Typography';
import { Header } from '../../components/Header';
import { CustomButton } from '../../components/CustomButton';
import { supabase } from '../../lib/supabase';

export default function PasswordScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    let valid = true;

    if (!currentPassword) {
      errors.current = 'Veuillez entrer votre mot de passe actuel.';
      valid = false;
    }

    if (!newPassword || newPassword.length < 8) {
      errors.new = 'Le nouveau mot de passe doit contenir au moins 8 caractères.';
      valid = false;
    }

    if (!confirmPassword) {
      errors.confirm = 'Veuillez confirmer le nouveau mot de passe.';
      valid = false;
    } else if (newPassword !== confirmPassword) {
      errors.confirm = 'Les mots de passe ne correspondent pas.';
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const handleSubmit = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        setErrorMessage(error.message || 'Une erreur est survenue. Veuillez réessayer.');
      } else {
        setSuccessMessage('Mot de passe mis à jour avec succès !');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFieldErrors({});
      }
    } catch (err: any) {
      setErrorMessage('Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title="Sécurité"
        leftContent={
          <TouchableOpacity
            onPress={goBack}
            style={{ padding: Layout.spacing.sm, marginLeft: -Layout.spacing.sm }}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.icon} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Lock Icon Header */}
        <View style={styles.iconHeader}>
          <View style={[styles.iconCircle, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MaterialIcons name="lock" size={36} color={theme.primary} />
          </View>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Changer le mot de passe</Text>
          <Text style={[styles.screenSubtitle, { color: theme.icon }]}>
            Choisissez un mot de passe fort d'au moins 8 caractères.
          </Text>
        </View>

        {/* Success Message */}
        {!!successMessage && (
          <View style={[styles.messageBanner, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}>
            <MaterialIcons name="check-circle" size={18} color="#10B981" />
            <Text style={[styles.messageText, { color: '#065F46' }]}>{successMessage}</Text>
          </View>
        )}

        {/* Global Error Message */}
        {!!errorMessage && (
          <View style={[styles.messageBanner, { backgroundColor: '#FEE2E2', borderColor: theme.danger }]}>
            <MaterialIcons name="error" size={18} color={theme.danger} />
            <Text style={[styles.messageText, { color: '#991B1B' }]}>{errorMessage}</Text>
          </View>
        )}

        {/* Current Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.icon }]}>Mot de passe actuel</Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: fieldErrors.current ? theme.danger : theme.border,
              },
            ]}
          >
            <MaterialIcons
              name="lock-outline"
              size={20}
              color={theme.icon}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Entrez votre mot de passe actuel"
              placeholderTextColor={theme.icon}
              value={currentPassword}
              onChangeText={(v) => {
                setCurrentPassword(v);
                if (fieldErrors.current) setFieldErrors((e) => ({ ...e, current: undefined }));
              }}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowCurrent((s) => !s)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={showCurrent ? 'visibility' : 'visibility-off'}
                size={20}
                color={theme.icon}
              />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.current && (
            <Text style={[styles.fieldError, { color: theme.danger }]}>{fieldErrors.current}</Text>
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* New Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.icon }]}>Nouveau mot de passe</Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: fieldErrors.new ? theme.danger : theme.border,
              },
            ]}
          >
            <MaterialIcons
              name="lock"
              size={20}
              color={theme.icon}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Au moins 8 caractères"
              placeholderTextColor={theme.icon}
              value={newPassword}
              onChangeText={(v) => {
                setNewPassword(v);
                if (fieldErrors.new) setFieldErrors((e) => ({ ...e, new: undefined }));
              }}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowNew((s) => !s)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={showNew ? 'visibility' : 'visibility-off'}
                size={20}
                color={theme.icon}
              />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.new && (
            <Text style={[styles.fieldError, { color: theme.danger }]}>{fieldErrors.new}</Text>
          )}
          {/* Strength indicator (visual feedback) */}
          {newPassword.length > 0 && (
            <View style={styles.strengthRow}>
              {[...Array(4)].map((_, i) => {
                const strength =
                  newPassword.length >= 12
                    ? 4
                    : newPassword.length >= 10
                    ? 3
                    : newPassword.length >= 8
                    ? 2
                    : 1;
                return (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          i < strength
                            ? strength === 1
                              ? theme.danger
                              : strength === 2
                              ? '#F59E0B'
                              : strength === 3
                              ? '#10B981'
                              : theme.primary
                            : theme.border,
                      },
                    ]}
                  />
                );
              })}
              <Text style={[styles.strengthLabel, { color: theme.icon }]}>
                {newPassword.length >= 12
                  ? 'Très fort'
                  : newPassword.length >= 10
                  ? 'Fort'
                  : newPassword.length >= 8
                  ? 'Correct'
                  : 'Faible'}
              </Text>
            </View>
          )}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.icon }]}>Confirmer le nouveau mot de passe</Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.card,
                borderColor: fieldErrors.confirm ? theme.danger : theme.border,
              },
            ]}
          >
            <MaterialIcons
              name="lock"
              size={20}
              color={theme.icon}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Répétez le nouveau mot de passe"
              placeholderTextColor={theme.icon}
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                if (fieldErrors.confirm) setFieldErrors((e) => ({ ...e, confirm: undefined }));
              }}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirm((s) => !s)}
              style={styles.eyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={showConfirm ? 'visibility' : 'visibility-off'}
                size={20}
                color={theme.icon}
              />
            </TouchableOpacity>
          </View>
          {!!fieldErrors.confirm && (
            <Text style={[styles.fieldError, { color: theme.danger }]}>{fieldErrors.confirm}</Text>
          )}
          {/* Match indicator */}
          {confirmPassword.length > 0 && newPassword === confirmPassword && (
            <View style={styles.matchRow}>
              <MaterialIcons name="check-circle" size={14} color="#10B981" />
              <Text style={[styles.matchText, { color: '#10B981' }]}>Les mots de passe correspondent</Text>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <CustomButton
          title={isLoading ? 'Mise à jour...' : 'Mettre à jour'}
          onPress={handleSubmit}
          disabled={isLoading}
          style={styles.submitButton}
          icon={
            isLoading ? (
              <ActivityIndicator size="small" color="#1A1D24" />
            ) : undefined
          }
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.xxl,
  },
  iconHeader: {
    alignItems: 'center',
    marginBottom: Layout.spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Layout.spacing.md,
  },
  screenTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Layout.spacing.sm,
    textAlign: 'center',
  },
  screenSubtitle: {
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Layout.spacing.lg,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    padding: Layout.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Layout.spacing.lg,
  },
  messageText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: Layout.spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginBottom: Layout.spacing.sm,
    marginLeft: Layout.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Layout.spacing.md,
  },
  inputIcon: {
    marginRight: Layout.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.md,
    height: '100%',
  },
  eyeButton: {
    padding: Layout.spacing.xs,
    marginLeft: Layout.spacing.sm,
  },
  fieldError: {
    fontSize: Typography.sizes.xs,
    marginTop: Layout.spacing.xs,
    marginLeft: Layout.spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginTop: Layout.spacing.sm,
    marginLeft: Layout.spacing.xs,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    marginLeft: Layout.spacing.xs,
    minWidth: 55,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    marginTop: Layout.spacing.sm,
    marginLeft: Layout.spacing.xs,
  },
  matchText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  divider: {
    height: 1,
    marginBottom: Layout.spacing.lg,
    marginHorizontal: Layout.spacing.xs,
  },
  submitButton: {
    marginTop: Layout.spacing.md,
  },
});
