import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Screen, AppText, AppButton, AppInput, Spacer, ErrorMessage } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { spacing } from '../../theme';
import type { AuthScreenProps } from '../../types/navigation';
import { Routes } from '../../navigation/routes';

export default function SignUpScreen({ navigation }: AuthScreenProps<typeof Routes.SignUp>) {
  const { colors, isDarkMode } = useTheme();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSignUp = async () => {
    setError('');

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, fullName.trim());
      if (result.error) {
        setError(result.error);
      } else if (result.needsVerification) {
        Alert.alert('تم التسجيل بنجاح', 'يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك', [
          { text: 'حسناً', onPress: () => navigation.navigate(Routes.Login) },
        ]);
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
        <Screen style={{ flex: 1, backgroundColor: isDarkMode ? colors.background : colors.surface }}>
          <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={styles.headerSection}>
              <Image
                source={require('../../../assets/black.jpeg')}
                style={styles.logo}
                resizeMode="contain"
              />
              <AppText variant="h2" style={{ textAlign: 'center' }}>
                إنشاء حساب
              </AppText>
              <Spacer size="xs" />
              <AppText variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
                أنشئ حسابك لبدء استخدام رفيق
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
              label="الاسم الكامل"
              placeholder="أدخل اسمك الكامل"
              value={fullName}
              onChangeText={setFullName}
              textContentType="name"
            />

            <AppInput
              label="البريد الإلكتروني"
              placeholder="أدخل بريدك الإلكتروني"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
            />

            <AppInput
              label="كلمة المرور"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
            />

            <AppInput
              label="تأكيد كلمة المرور"
              placeholder="أعد إدخال كلمة المرور"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="password"
              onSubmitEditing={handleSignUp}
            />

            <Spacer size="lg" />

            <AppButton
              title="إنشاء حساب"
              onPress={handleSignUp}
              loading={loading}
              disabled={loading}
            />

            <Spacer size="lg" />

            <AppButton
              title="لديك حساب بالفعل؟ سجّل دخولك"
              onPress={() => navigation.navigate(Routes.Login)}
              variant="outlined"
            />
          </Animated.View>
        </Screen>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  headerSection: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.md,
  },
});