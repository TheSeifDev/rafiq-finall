import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { SegmentedToggle } from '../components/ui/SegmentedToggle';
import { AuthTopControls } from '../components/AuthTopControls';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/app.store';
import { translations } from '../constants/translations';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

// ── Layout helpers — declared OUTSIDE component to keep stable references ──
function Row({ children, isNarrow }: { children: React.ReactNode; isNarrow: boolean }) {
  return (
    <View style={[styles.row, isNarrow && styles.rowColumn]}>
      {children}
    </View>
  );
}

function Col({ children }: { children: React.ReactNode }) {
  return <View style={styles.col}>{children}</View>;
}

export function SignUpScreen({ navigation }: Props): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const isSmallDevice = height < 700;
  const isNarrow = width < 380;

  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);

  const backBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const backBorder = darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  const responsiveSpacing = {
    top: isSmallDevice ? spacing.lg : spacing['2xl'],
    gap: isSmallDevice ? spacing.md : spacing.xl,
  };

  const handleSignUp = useCallback(async () => {
    if (!name || !phone || !email || !password || !location || !birthDate) {
      Alert.alert(
        language === 'ar' ? 'تنبيه' : 'Notice',
        language === 'ar' ? 'يرجى ملء جميع الخانات' : 'Please fill in all fields',
      );
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(
        language === 'ar' ? 'تنبيه' : 'Notice',
        language === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match',
      );
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create auth user with profile metadata
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
            location,
            birth_date: birthDate,
          },
        },
      });

      if (authError) {
        Alert.alert(
          language === 'ar' ? 'خطأ في التسجيل' : 'Sign Up Error',
          authError.message,
        );
        setLoading(false);
        return;
      }

      // Step 2: Success — tell user to verify email, patient row created on first login
      Alert.alert(
        language === 'ar' ? 'تم إنشاء الحساب ✓' : 'Account Created ✓',
        language === 'ar'
          ? 'تم إنشاء الحساب بنجاح.\n\nيرجى التحقق من بريدك الإلكتروني لتأكيد الحساب قبل تسجيل الدخول.'
          : 'Account created successfully.\n\nPlease check your email to verify your account before logging in.',
        [
          {
            text: language === 'ar' ? 'تسجيل الدخول' : 'Go to Login',
            onPress: () => navigation.replace('Login'),
          },
        ],
      );
    } catch (err: any) {
      Alert.alert(
        language === 'ar' ? 'خطأ غير متوقع' : 'Unexpected Error',
        err.message,
      );
    } finally {
      setLoading(false);
    }
  }, [name, phone, email, password, confirmPassword, location, birthDate, language, navigation]);

  // Memoize inline text-processing callbacks to avoid new refs each render
  const onChangePhone = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(cleaned);
  }, []);

  const onChangeBirthDate = useCallback((text: string) => {
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length >= 4) {
      cleaned = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
    }
    if (cleaned.length >= 7) {
      cleaned = cleaned.slice(0, 7) + '-' + cleaned.slice(7, 10);
    }
    setBirthDate(cleaned);
  }, []);

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: responsiveSpacing.top,
              gap: responsiveSpacing.gap,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header row: Back + Quick settings */}
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

          <View style={styles.toggleWrap}>
            <SegmentedToggle
              options={[
                { label: t.login, value: 'login' },
                { label: t.signup, value: 'signup' },
              ]}
              activeValue="signup"
              onChange={(val) => {
                if (val === 'login') navigation.replace('Login');
              }}
            />
          </View>

          <View style={styles.form}>
            {/* Full width: Name */}
            <AppInput
              label={t.fullName}
              placeholder={t.fullName}
              value={name}
              onChangeText={setName}
              textContentType="name"
              autoComplete="name"
            />

            {/* Row: Phone + Email */}
            <Row isNarrow={isNarrow}>
              <Col>
                <AppInput
                  label={t.phone}
                  placeholder="01xxxxxxxx"
                  value={phone}
                  onChangeText={onChangePhone}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                />
              </Col>
              <Col>
                <AppInput
                  label={t.email}
                  placeholder="example@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              </Col>
            </Row>

            {/* Row: Location + Birth Date */}
            <Row isNarrow={isNarrow}>
              <Col>
                <AppInput
                  label={t.location}
                  placeholder="القاهرة، مصر"
                  value={location}
                  onChangeText={setLocation}
                  icon={<Ionicons name="location-outline" size={20} color={colors.textSecondary} />}
                />
              </Col>
              <Col>
                <AppInput
                  label={t.birthDate}
                  placeholder="YYYY-MM-DD"
                  value={birthDate}
                  onChangeText={onChangeBirthDate}
                  keyboardType="numeric"
                  icon={<Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />}
                />
              </Col>
            </Row>

            {/* Row: Password + Confirm */}
            <Row isNarrow={isNarrow}>
              <Col>
                <AppInput
                  label={t.password}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secure}
                  isPassword
                  onToggleSecure={() => setSecure(!secure)}
                  textContentType="newPassword"
                  autoComplete="new-password"
                />
              </Col>
              <Col>
                <AppInput
                  label={t.confirmPassword}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={secureConfirm}
                  isPassword
                  onToggleSecure={() => setSecureConfirm(!secureConfirm)}
                  textContentType="newPassword"
                />
              </Col>
            </Row>

            <AppButton
              title={loading
                ? (language === 'ar' ? 'جاري التسجيل...' : 'Creating account...')
                : t.signup
              }
              variant="tertiary"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
              style={[
                styles.submit,
                isSmallDevice ? { height: 52, marginTop: spacing.md } : undefined,
              ]}
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
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginBottom: spacing.sm,
  },
  form: {
    width: '100%',
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  rowColumn: {
    flexDirection: 'column',
  },
  col: {
    flex: 1,
    minWidth: 140,
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