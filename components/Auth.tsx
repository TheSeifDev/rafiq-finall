import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Screen } from '../src/components/ui/Screen';
import { AppText } from '../src/components/ui/AppText';
import { AppButton } from '../src/components/ui/AppButton';
import { AppInput } from '../src/components/ui/AppInput';
import { SegmentedToggle } from '../src/components/ui/SegmentedToggle';
import { spacing } from '../src/theme';
import { supabase } from '../lib/supabase';

type AuthMode = 'login' | 'signup';

const COLORS = {
  neutral: '#0A0F1C',
  tertiary: '#FF3B3B',
};

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) {
      Alert.alert('تنبيه', 'يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert('خطأ في تسجيل الدخول', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (!email || !password || !fullName) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الخانات بما فيها الاسم الكامل');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('تنبيه', 'كلمتا المرور غير متطابقتين');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      Alert.alert('خطأ في التسجيل', error.message);
    } else if (!data.session) {
      Alert.alert('نجاح', 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب');
    }
    setLoading(false);
  }

  const isSignUp = mode === 'signup';

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
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCard}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <AppText style={styles.brand}>رفيق</AppText>
          </View>

          {/* Toggle */}
          <View style={styles.toggleWrap}>
            <SegmentedToggle
              options={[
                { label: 'تسجيل الدخول', value: 'login' },
                { label: 'إنشاء حساب', value: 'signup' },
              ]}
              activeValue={mode}
              onChange={(val: string) => setMode(val as AuthMode)}
            />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {isSignUp && (
              <AppInput
                label="الاسم الكامل"
                placeholder="الاسم الكامل"
                value={fullName}
                onChangeText={setFullName}
                textContentType="name"
              />
            )}

            <AppInput
              label="البريد الإلكتروني"
              placeholder="example@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />

            <AppInput
              label="كلمة المرور"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />

            {isSignUp && (
              <AppInput
                label="تأكيد كلمة المرور"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                textContentType="password"
              />
            )}

            <AppButton
              title={isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول'}
              variant="tertiary"
              onPress={isSignUp ? signUpWithEmail : signInWithEmail}
              loading={loading}
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
    backgroundColor: COLORS.neutral,
    paddingHorizontal: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  logoWrap: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  logoCard: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 64,
    height: 64,
  },
  brand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  toggleWrap: {
    marginBottom: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  submit: {
    marginTop: spacing.lg,
    height: 58,
    borderRadius: 16,
    shadowColor: COLORS.tertiary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
});