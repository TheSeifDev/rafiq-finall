import React, { useState } from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { spacing } from '../theme';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props): React.JSX.Element {
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <Screen style={{ padding: spacing.lg, gap: spacing.md }}>
      <AppInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <AppInput label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorMessage message={error} />
      <AppButton
        title="دخول"
        loading={loading}
        onPress={async () => {
          setLoading(true);
          setError(undefined);
          try {
            await signIn(email.trim(), password);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
          } finally {
            setLoading(false);
          }
        }}
      />
      <AppButton
        title="نسيت كلمة المرور"
        variant="ghost"
        onPress={async () => {
          try {
            await authService.resetPassword(email.trim());
            setError('تم إرسال رابط إعادة التعيين للبريد الإلكتروني');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Reset failed');
          }
        }}
      />
      <AppButton title="العودة" variant="ghost" onPress={() => navigation.goBack()} />
    </Screen>
  );
}
