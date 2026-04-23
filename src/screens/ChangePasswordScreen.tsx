import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { authService } from '../services/auth.service';
import { translations } from '../constants/translations';
import type { ProfileStackScreenProps } from '../navigation/types';

type Props = ProfileStackScreenProps<'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language] as any;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = useCallback(async () => {
    setStatusMsg(null);

    if (newPassword.length < 8) {
      setStatusMsg({ type: 'error', text: t.passwordTooShort });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: t.passwordMismatch });
      return;
    }

    setSaving(true);
    try {
      await authService.updatePassword(newPassword);
      setStatusMsg({ type: 'success', text: t.passwordChanged });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message ?? t.saveFailed });
    } finally {
      setSaving(false);
    }
  }, [newPassword, confirmPassword, t]);

  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.80)' : 'rgba(255, 255, 255, 0.92)';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  // Password strength indicator
  const strength = newPassword.length === 0 ? 0 : newPassword.length < 6 ? 1 : newPassword.length < 10 ? 2 : 3;
  const strengthColors = ['transparent', colors.danger, colors.warning, colors.success];
  const strengthLabels = {
    ar: ['', 'ضعيفة', 'متوسطة', 'قوية'],
    en: ['', 'Weak', 'Medium', 'Strong'],
  };

  return (
    <Screen>
      <ScreenHeader title={t.changePassword} onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Status Banner ── */}
          {statusMsg && (
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: statusMsg.type === 'success' ? colors.success + '15' : colors.danger + '15',
                  borderColor: statusMsg.type === 'success' ? colors.success + '30' : colors.danger + '30',
                },
              ]}
            >
              <Ionicons
                name={statusMsg.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={statusMsg.type === 'success' ? colors.success : colors.danger}
              />
              <AppText
                style={[
                  styles.statusText,
                  { color: statusMsg.type === 'success' ? colors.success : colors.danger },
                ]}
              >
                {statusMsg.text}
              </AppText>
            </View>
          )}

          {/* ── Info card ── */}
          <View style={[styles.infoCard, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '15' }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <AppText style={[styles.infoText, { color: colors.textSecondary }]}>
              {language === 'ar'
                ? 'أدخل كلمة مرور جديدة. يجب أن تكون 8 أحرف على الأقل.'
                : 'Enter a new password. It must be at least 8 characters long.'}
            </AppText>
          </View>

          {/* ── Form ── */}
          <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <AppInput
              label={t.newPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              isPassword
              onToggleSecure={() => setShowNew(!showNew)}
              autoCapitalize="none"
              textContentType="newPassword"
            />

            {/* Strength indicator */}
            {newPassword.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3].map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor: strength >= level ? strengthColors[strength] : (darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                      },
                    ]}
                  />
                ))}
                <AppText style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
                  {(strengthLabels as any)[language][strength]}
                </AppText>
              </View>
            )}

            <AppInput
              label={t.confirmNewPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              isPassword
              onToggleSecure={() => setShowConfirm(!showConfirm)}
              autoCapitalize="none"
              textContentType="newPassword"
            />
          </View>

          {/* ── Save Button ── */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving || newPassword.length === 0}
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: saving || newPassword.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={20} color="#fff" />
                <AppText style={styles.saveBtnText}>{t.changePassword}</AppText>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
