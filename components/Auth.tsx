import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const { height } = useWindowDimensions();
  const isSmallDevice = height < 700;

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [birthDate, setBirthDate] = useState('');
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
    if (!email || !password || !fullName || !phone || !location || !birthDate) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الخانات بما فيها الاسم الكامل والموقع وتاريخ الميلاد');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('تنبيه', 'كلمتا المرور غير متطابقتين');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) {
        Alert.alert('خطأ في التسجيل', error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: patientError } = await supabase
          .from('patients')
          .insert({
            user_id: data.user.id,
            full_name: fullName,
            phone,
            location,
            birth_date: birthDate,
          });
          
        if (patientError) {
          Alert.alert('خطأ في حفظ البيانات', patientError.message);
          setLoading(false);
          return;
        }
      }

      if (!data.session) {
        Alert.alert('نجاح', 'تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب');
      }
    } catch (err: any) {
      Alert.alert('خطأ غير متوقع', err.message);
    } finally {
      setLoading(false);
    }
  }

  const isSignUp = mode === 'signup';

  const responsiveSpacing = {
    top: isSmallDevice ? spacing.lg : spacing['2xl'],
    gap: isSmallDevice ? spacing.md : spacing.xl,
    formGap: isSmallDevice ? spacing.sm : spacing.md,
  };

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
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
          {/* Logo */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCard}>
              <Image
                source={require('../assets/logo.png')}
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
          <View style={[styles.form, { gap: responsiveSpacing.formGap }]}>
            {isSignUp && (
              <>
                <AppInput
                  label="الاسم الكامل"
                  placeholder="الاسم الكامل"
                  value={fullName}
                  onChangeText={setFullName}
                  textContentType="name"
                />
                <AppInput
                  label="رقم الجوال"
                  placeholder="01xxxxxxxx"
                  value={phone}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 11);
                    setPhone(cleaned);
                  }}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                />
              </>
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

            {isSignUp && (
              <>
                <AppInput
                  label="الموقع"
                  placeholder="القاهرة، مصر"
                  value={location}
                  onChangeText={setLocation}
                  icon={<Ionicons name="location-outline" size={20} color="rgba(255,255,255,0.5)" />}
                />
                <AppInput
                  label="تاريخ الميلاد"
                  placeholder="YYYY-MM-DD"
                  value={birthDate}
                  onChangeText={(text) => {
                    let cleaned = text.replace(/[^0-9]/g, '');
                    if (cleaned.length >= 4) cleaned = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
                    if (cleaned.length >= 7) cleaned = cleaned.slice(0, 7) + '-' + cleaned.slice(7, 10);
                    setBirthDate(cleaned);
                  }}
                  keyboardType="numeric"
                  icon={<Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.5)" />}
                />
              </>
            )}

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
    backgroundColor: COLORS.neutral,
    paddingHorizontal: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: spacing.xl,
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
    width: '100%',
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