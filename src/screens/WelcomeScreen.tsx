import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { AuthTopControls } from '../components/AuthTopControls';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { translations } from '../constants/translations';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  const [agreed, setAgreed] = useState(false);
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const mutedText = darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';
  const subtleText = darkMode ? 'rgba(255,255,255,0.60)' : 'rgba(0,0,0,0.50)';
  const subtleBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const subtleSurface = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const checkBorder = darkMode ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.25)';
  const outlineBorder = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';

  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        {/* Quick Settings */}
        <AuthTopControls />

        {/* Brand Section */}
        <View style={styles.brandSection}>
          <View style={[styles.logoCard, { backgroundColor: subtleSurface, borderColor: subtleBorder }]}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.textBox}>
            <AppText style={[styles.brand, { color: colors.textPrimary }]}>
              {t.appName}
            </AppText>
            <View style={[styles.accentDivider, { backgroundColor: colors.danger }]} />
            <AppText style={[styles.tagline, { color: mutedText }]}>
              {t.welcomeSubtitle}
            </AppText>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <AppButton
            title={t.login}
            variant="tertiary"
            onPress={() => navigation.navigate('Login')}
            style={styles.mainBtn}
            disabled={!agreed}
          />
          <AppButton
            title={t.signup}
            variant="outlined"
            onPress={() => navigation.navigate('SignUp')}
            style={[styles.secondBtn, { borderColor: outlineBorder }]}
            disabled={!agreed}
          />

          <View style={styles.footer}>
            <Pressable
              style={styles.checkboxRow}
              onPress={() => setAgreed(!agreed)}
            >
              <View
                style={[
                  styles.checkbox,
                  { borderColor: checkBorder },
                  agreed && { borderColor: colors.secondary, backgroundColor: colors.secondary },
                ]}
              >
                {agreed && <View style={styles.checkboxDot} />}
              </View>
              <AppText style={[styles.checkboxText, { color: subtleText }]}>
                {t.agree}{' '}
                <AppText
                  style={[styles.checkboxLink, { color: colors.secondary }]}
                  onPress={() => navigation.navigate('TermsOfService')}
                >
                  {t.termsOfService}
                </AppText>{' '}
                {t.and}{' '}
                <AppText
                  style={[styles.checkboxLink, { color: colors.secondary }]}
                  onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                  {t.privacyPolicy}
                </AppText>
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderWidth: 1,
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
    letterSpacing: -0.5,
  },
  accentDivider: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 22,
  },
  checkboxLink: {
    fontWeight: '700',
  },
  mainBtn: {
    height: 58,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  secondBtn: {
    height: 58,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});