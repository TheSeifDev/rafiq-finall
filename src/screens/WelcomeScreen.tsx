import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { spacing } from '../theme';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const COLORS = {
  neutral: '#0A0F1C',
  primary: '#00C2FF',
  tertiary: '#FF3B3B',
  white: '#FFFFFF',
};

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <Screen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.neutral} />

      <View style={styles.content}>
        {/* Brand Section */}
        <View style={styles.brandSection}>
          <View style={styles.logoCard}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.textBox}>
            <AppText style={styles.brand}>رفيق</AppText>
            <View style={styles.accentDivider} />
            <AppText style={styles.tagline}>
              مرافقك الصحي الاحترافي
            </AppText>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <AppButton
            title="تسجيل الدخول"
            variant="tertiary"
            onPress={() => navigation.navigate('Login')}
            style={styles.mainBtn}
          />
          <AppButton
            title="إنشاء حساب"
            variant="outlined"
            onPress={() => navigation.navigate('SignUp')}
            style={styles.secondBtn}
          />

          <View style={styles.footer}>
            <AppText style={styles.footerText}>
              بالمتابعة، أنت توافق على{' '}
              <AppText style={styles.footerLink}>شروط الاستخدام</AppText> و{' '}
              <AppText style={styles.footerLink}>سياسة الخصوصية</AppText>
            </AppText>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  brandSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
  },
  logoCard: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
  },
  textBox: {
    alignItems: 'center',
    gap: spacing.md,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  accentDivider: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.tertiary,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  mainBtn: {
    height: 58,
    borderRadius: 16,
    shadowColor: COLORS.tertiary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  secondBtn: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'transparent',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});