import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { SegmentedToggle } from '../components/ui/SegmentedToggle';
import { AuthTopControls } from '../components/AuthTopControls';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { authService } from '../services/auth.service';
import { translations } from '../constants/translations';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

// ── Supabase error message detection ──
const EMAIL_NOT_CONFIRMED_PATTERNS = [
  'email not confirmed',
  'email_not_confirmed',
];

function isEmailNotConfirmedError(message: string): boolean {
  const lower = message.toLowerCase();
  return EMAIL_NOT_CONFIRMED_PATTERNS.some((p) => lower.includes(p));
}

function isInvalidCredentialsError(message: string): boolean {
  return message.toLowerCase().includes('invalid login credentials');
}

// ── Inline status banner (replaces ugly Alert) ──
type BannerType = 'error' | 'info' | 'success';

function StatusBanner({
  message,
  type,
  darkMode,
  colors,
  onAction,
  actionLabel,
  actionLoading,
}: {
  message: string;
  type: BannerType;
  darkMode: boolean;
  colors: any;
  onAction?: () => void;
  actionLabel?: string;
  actionLoading?: boolean;
}) {
  const bgMap: Record<BannerType, string> = {
    error: darkMode ? 'rgba(255,59,59,0.12)' : 'rgba(255,59,59,0.08)',
    info: darkMode ? 'rgba(0,194,255,0.12)' : 'rgba(0,119,200,0.08)',
    success: darkMode ? 'rgba(52,199,89,0.12)' : 'rgba(52,199,89,0.08)',
  };
  const borderMap: Record<BannerType, string> = {
    error: darkMode ? 'rgba(255,59,59,0.30)' : 'rgba(255,59,59,0.20)',
    info: darkMode ? 'rgba(0,194,255,0.30)' : 'rgba(0,119,200,0.20)',
    success: darkMode ? 'rgba(52,199,89,0.30)' : 'rgba(52,199,89,0.20)',
  };
  const iconMap: Record<BannerType, string> = {
    error: 'alert-circle',
    info: 'mail-outline',
    success: 'checkmark-circle',
  };
  const iconColorMap: Record<BannerType, string> = {
    error: '#FF3B3B',
    info: '#00C2FF',
    success: '#34C759',
  };

  return (
    <View style={[bannerStyles.container, { backgroundColor: bgMap[type], borderColor: borderMap[type] }]}>
      <View style={bannerStyles.row}>
        <Ionicons name={iconMap[type] as any} size={20} color={iconColorMap[type]} style={bannerStyles.icon} />
        <AppText style={[bannerStyles.text, { color: colors.textPrimary }]}>
          {message}
        </AppText>
      </View>
      {onAction && actionLabel && (
        <TouchableOpacity
          onPress={onAction}
          disabled={actionLoading}
          activeOpacity={0.7}
          style={[bannerStyles.actionBtn, { borderColor: borderMap[type] }]}
        >
          <AppText style={[bannerStyles.actionText, { color: iconColorMap[type] }]}>
            {actionLoading ? '...' : actionLabel}
          </AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  icon: { marginTop: 2 },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  actionBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 30,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

// ── Main Screen ──
export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [banner, setBanner] = useState<{ message: string; type: BannerType; showResend: boolean } | null>(null);

  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];
  const signIn = useAuthStore((s) => s.signIn);
  const isAr = language === 'ar';

  const backBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const backBorder = darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  const handleLogin = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setBanner({
        message: isAr ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password.',
        type: 'error',
        showResend: false,
      });
      return;
    }

    setBanner(null);
    setLoading(true);
    try {
      await signIn(trimmedEmail, password);
      // Success → RootNavigator auto-switches to MainNavigator
    } catch (error: unknown) {
      const rawMsg = error instanceof Error ? error.message : 'Unknown error';

      if (isEmailNotConfirmedError(rawMsg)) {
        setBanner({
          message: isAr
            ? 'يرجى تأكيد البريد الإلكتروني أولاً ثم تسجيل الدخول'
            : 'Please verify your email before logging in.',
          type: 'info',
          showResend: true,
        });
      } else if (isInvalidCredentialsError(rawMsg)) {
        // Supabase returns this for both wrong password AND unconfirmed email
        setBanner({
          message: isAr
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.\nإذا سجلت مؤخراً، تأكد من تفعيل بريدك الإلكتروني.'
            : 'Incorrect email or password.\nIf you signed up recently, make sure to verify your email.',
          type: 'error',
          showResend: true,
        });
      } else {
        setBanner({
          message: rawMsg,
          type: 'error',
          showResend: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn, isAr]);

  const handleResend = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    setResending(true);
    try {
      await authService.resendVerification(trimmedEmail);
      setBanner({
        message: isAr
          ? 'تم إرسال رابط التحقق إلى بريدك الإلكتروني'
          : 'Verification link sent to your email.',
        type: 'success',
        showResend: false,
      });
    } catch {
      setBanner({
        message: isAr
          ? 'تعذر إرسال رابط التحقق، حاول مرة أخرى'
          : 'Could not send verification link. Try again.',
        type: 'error',
        showResend: true,
      });
    } finally {
      setResending(false);
    }
  }, [email, isAr]);

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Welcome')}
              activeOpacity={0.7}
            >
              <View style={[styles.backCircle, { backgroundColor: backBg, borderColor: backBorder }]}>
                <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>
            <AuthTopControls />
          </View>

          {/* Toggle */}
          <View style={styles.toggleWrap}>
            <SegmentedToggle
              options={[
                { label: t.login, value: 'login' },
                { label: t.signup, value: 'signup' },
              ]}
              activeValue="login"
              onChange={(val) => {
                if (val === 'signup') navigation.replace('SignUp');
              }}
            />
          </View>

          {/* Status Banner */}
          {banner && (
            <StatusBanner
              message={banner.message}
              type={banner.type}
              darkMode={darkMode}
              colors={colors}
              onAction={banner.showResend ? handleResend : undefined}
              actionLabel={banner.showResend
                ? (isAr ? 'إعادة إرسال التحقق' : 'Resend verification')
                : undefined
              }
              actionLoading={resending}
            />
          )}

          <View style={styles.form}>
            <AppInput
              label={t.email}
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />

            <AppInput
              label={t.password}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              isPassword
              onToggleSecure={() => setSecure(!secure)}
              textContentType="password"
            />

            <TouchableOpacity activeOpacity={0.7} style={styles.forgot}>
              <AppText style={[styles.forgotText, { color: colors.secondary }]}>
                {t.forgotPassword}
              </AppText>
            </TouchableOpacity>

            <AppButton
              title={loading
                ? (isAr ? 'جاري الدخول...' : 'Signing in...')
                : t.login
              }
              variant="tertiary"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleWrap: {
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submit: {
    marginTop: spacing.lg,
    height: 58,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
});