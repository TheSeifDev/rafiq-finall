import React from 'react';
import { Linking, ScrollView } from 'react-native';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { spacing } from '../theme';

const emergencyNumbers = ['997', '998', '999', '920033333'];

export function EmergencyScreen(): React.JSX.Element {
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <AppCard>
          <AppText variant="h2">اتصال طوارئ فوري</AppText>
          {emergencyNumbers.map((number) => (
            <AppButton key={number} title={`اتصال ${number}`} onPress={() => Linking.openURL(`tel:${number}`)} style={{ marginTop: spacing.sm }} />
          ))}
        </AppCard>
        <AppCard>
          <AppText variant="h2">إسعافات أولية</AppText>
          <AppText>• قلب: ابدأ الإنعاش القلبي الرئوي فوراً.</AppText>
          <AppText>• صعوبة التنفس: ضع المصاب بوضعية مريحة مع رفع الرأس.</AppText>
          <AppText>• إغماء: ضع المصاب بوضعية الإفاقة على الجانب.</AppText>
        </AppCard>
      </ScrollView>
    </Screen>
  );
}
