import React, { useEffect, useState } from 'react';
import { Screen } from '../components/ui/Screen';
import { AppCard } from '../components/ui/AppCard';
import { AppButton } from '../components/ui/AppButton';
import { AppText } from '../components/ui/AppText';
import { spacing } from '../theme';
import { useAuthStore } from '../store/auth.store';
import { patientService, type PatientProfile } from '../services/patient.service';
import type { ProfileStackScreenProps } from '../navigation/types';

type Props = ProfileStackScreenProps<'ProfileMain'>;

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    patientService.getProfile(session.user.id).then(setProfile).catch(() => undefined);
  }, [session?.user.id]);

  return (
    <Screen style={{ padding: spacing.md, gap: spacing.md }}>
      <AppCard>
        <AppText variant="h2">الملف الصحي</AppText>
        <AppText>{profile?.full_name ?? '—'}</AppText>
        <AppText>{session?.user.email ?? '—'}</AppText>
        <AppText>Blood type: {profile?.blood_type ?? '—'}</AppText>
      </AppCard>
      <AppButton title="الإعدادات" onPress={() => navigation.navigate('Settings')} />
      <AppButton title="الأدوية" variant="secondary" onPress={() => navigation.navigate('Medications')} />
    </Screen>
  );
}
