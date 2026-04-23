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
import { spacing } from '../theme';
import { supabase } from '../lib/supabase';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const COLORS = {
  neutral: '#0A0F1C',
  primary: '#00C2FF',
  tertiary: '#FF3B3B',
};

export function SignUpScreen({ navigation }: Props): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const isSmallDevice = height < 700;
  const isNarrow = width < 380; // iPhone SE and smaller

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

  const responsiveSpacing = {
    top: isSmallDevice ? spacing.lg : spacing['2xl'],
    gap: isSmallDevice ? spacing.md : spacing.xl,
  };

  const handleSignUp = useCallback(async () => {
    if (!name || !phone || !email || !password || !location || !birthDate) {
      Alert.alert('تنبيه', 'يرجى ملء جميع الخانات');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('تنبيه', 'كلمتا المرور غير متطابقتين');
      return;
    }
    
    setLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (authError) {
        Alert.alert('خطأ في التسجيل', authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        Alert.alert('خطأ', 'لم يتم إنشاء المستخدم');
        setLoading(false);
        return;
      }

      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          user_id: authData.user.id,
          full_name: name,
          phone,
          location,
          birth_date: birthDate,
        });

      if (patientError) {
        Alert.alert('خطأ في حفظ البيانات', patientError.message);
        setLoading(false);
        return;
      }

      Alert.alert('نجاح', 'تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني.');
      
    } catch (err: any) {
      Alert.alert('خطأ غير متوقع', err.message);
    } finally {
      setLoading(false);
    }
  }, [name, phone, email, password, confirmPassword, location, birthDate]);

  // Helper: row of inputs (side by side on wide screens, stacked on narrow)
  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={[styles.row, isNarrow && styles.rowColumn]}>
      {children}
    </View>
  );

  // Helper: each input takes half width (or full if narrow)
  const Col = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.col}>
      {children}
    </View>
  );

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
          <TouchableOpacity
            onPress={() => navigation.navigate('Welcome')}
            style={styles.back}
            activeOpacity={0.7}
          >
            <View style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.toggleWrap}>
            <SegmentedToggle
              options={[
                { label: 'تسجيل الدخول', value: 'login' },
                { label: 'إنشاء حساب', value: 'signup' },
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
              label="الاسم الكامل"
              placeholder="الاسم الكامل"
              value={name}
              onChangeText={setName}
              textContentType="name"
              autoComplete="name"
            />

            {/* Row: Phone + Email */}
            <Row>
              <Col>
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
                  autoComplete="tel"
                />
              </Col>
              <Col>
                <AppInput
                  label="البريد الإلكتروني"
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
            <Row>
              <Col>
                <AppInput
                  label="الموقع"
                  placeholder="القاهرة، مصر"
                  value={location}
                  onChangeText={setLocation}
                  icon={<Ionicons name="location-outline" size={20} color="rgba(255,255,255,0.5)" />}
                />
              </Col>
              <Col>
                <AppInput
                  label="تاريخ الميلاد"
                  placeholder="YYYY-MM-DD"
                  value={birthDate}
                  onChangeText={(text) => {
                    let cleaned = text.replace(/[^0-9]/g, '');
                    if (cleaned.length >= 4) {
                      cleaned = cleaned.slice(0, 4) + '-' + cleaned.slice(4);
                    }
                    if (cleaned.length >= 7) {
                      cleaned = cleaned.slice(0, 7) + '-' + cleaned.slice(7, 10);
                    }
                    setBirthDate(cleaned);
                  }}
                  keyboardType="numeric"
                  icon={<Ionicons name="calendar-outline" size={20} color="rgba(255,255,255,0.5)" />}
                />
              </Col>
            </Row>

            {/* Row: Password + Confirm */}
            <Row>
              <Col>
                <AppInput
                  label="كلمة المرور"
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
                  label="تأكيد كلمة المرور"
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
              title="إنشاء حساب"
              variant="tertiary"
              onPress={handleSignUp}
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
  back: {
    alignSelf: 'flex-start',
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    minWidth: 140, // قبل ما ينزل تحت على الشاشات المتوسطة
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