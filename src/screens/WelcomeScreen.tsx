import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { spacing } from '../theme';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props): React.JSX.Element {
  return (
    <Screen style={{ padding: spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="display">رفيق</AppText>
        <AppText>مرافقك الصحي الاحترافي</AppText>
      </View>
      <AppButton title="تسجيل الدخول" onPress={() => navigation.navigate('Login')} />
      <AppButton title="إنشاء حساب" variant="secondary" onPress={() => navigation.navigate('SignUp')} />
    </Screen>
  );
}
