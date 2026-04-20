import React, { useMemo, useState } from 'react';
import { Screen } from '../components/ui/Screen';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { spacing } from '../theme';
import { useAuthStore } from '../store/auth.store';

export function SignUpScreen(): React.JSX.Element {
  const signUp = useAuthStore((state) => state.signUp);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => {
    if (password.length < 8) return 'Weak';
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return 'Strong';
    return 'Medium';
  }, [password]);

  return (
    <Screen style={{ padding: spacing.lg, gap: spacing.md }}>
      <AppInput label="البريد الإلكتروني" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <AppInput label="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry />
      <ErrorMessage message={`Password strength: ${strength}`} />
      <ErrorMessage message={error} />
      <AppButton
        title="إنشاء حساب"
        loading={loading}
        onPress={async () => {
          setLoading(true);
          setError(undefined);
          try {
            await signUp(email.trim(), password);
            setError('تم إنشاء الحساب. يرجى تأكيد البريد الإلكتروني.');
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign up failed');
          } finally {
            setLoading(false);
          }
        }}
      />
    </Screen>
  );
}
