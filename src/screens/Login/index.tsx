import React, { useRef, useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Screen, AppText, AppButton, AppInput, Spacer, ErrorMessage } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { spacing } from '../../theme';
import type { AuthScreenProps } from '../../types/navigation';
import { Routes } from '../../navigation/routes';

export default function LoginScreen({ navigation }: AuthScreenProps<typeof Routes.Login>) {
  const { colors, isDarkMode } = useTheme();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('حدث خطأ. يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1 }}>
        <Screen
          scrollable
          backgroundColor={isDarkMode ? colors.background : colors.surface}
          statusBarStyle={isDarkMode ? 'light-content' : 'dark-content'}
        >
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={styles.headerSection}>
              <Image
                source={require('../../../assets/black.jpeg')}
                style={styles.logo}
                resizeMode="contain"
              />
              <AppText variant="h2" align="center">
                تسجيل الدخول
              </AppText>
              <Spacer size="xs" />
              <AppText variant="bodySmall" color={colors.textSecondary} align="center">
                أدخل بياناتك للمتابعة
              </AppText>
            </View>

            <Spacer size="xl" />

            {error ? (
              <>
                <ErrorMessage message={error} />
                <Spacer size="md" />
              </>
            ) : null}

            <AppInput
              label="البريد الإلكتروني"
              placeholder="أدخل بريدك الإلكتروني"
              icon="email-outline"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              returnKeyType="next"
            />

            <AppInput
              label="كلمة المرور"
              placeholder="أدخل كلمة المرور"
              icon="lock-outline"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <Spacer size="lg" />

            <AppButton
              label="تسجيل الدخول"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              size="lg"
            />

            <Spacer size="lg" />

            <AppButton
              label="ليس لديك حساب؟ سجّل الآن"
              onPress={() => navigation.navigate(Routes.SignUp)}
              variant="ghost"
            />
          </Animated.View>
        </Screen>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  headerSection: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
});
