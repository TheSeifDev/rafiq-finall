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
import { AuthTopControls } from '../components/AuthTopControls';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { translations } from '../constants/translations';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const backBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const backBorder = darkMode ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

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

          {/* Toggle Switch */}
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
              title={t.login}
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