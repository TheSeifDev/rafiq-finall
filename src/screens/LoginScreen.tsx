import React, { useState } from 'react';
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
import { spacing } from '../theme';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const COLORS = {
  neutral: '#0A0F1C',
  primary: '#00C2FF',
  tertiary: '#FF3B3B',
};

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);

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
          {/* Back to Welcome */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Welcome')}
            style={styles.back}
            activeOpacity={0.7}
          >
            <View style={styles.backCircle}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Toggle Switch */}
          <View style={styles.toggleWrap}>
            <SegmentedToggle
              options={[
                { label: 'تسجيل الدخول', value: 'login' },
                { label: 'إنشاء حساب', value: 'signup' },
              ]}
              activeValue="login"
              onChange={(val) => {
                if (val === 'signup') navigation.replace('SignUp');
              }}
            />
          </View>

          <View style={styles.form}>
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
              secureTextEntry={secure}
              isPassword
              onToggleSecure={() => setSecure(!secure)}
              textContentType="password"
            />

            <TouchableOpacity activeOpacity={0.7} style={styles.forgot}>
              <AppText style={styles.forgotText}>نسيت كلمة المرور؟</AppText>
            </TouchableOpacity>

            <AppButton
              title="تسجيل الدخول"
              variant="tertiary"
              onPress={() => {}}
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
  back: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
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
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
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