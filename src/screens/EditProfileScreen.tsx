import React, { useEffect, useState } from 'react';
import { Screen } from '../components/ui/Screen';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { spacing } from '../theme';
import { useAuthStore } from '../store/auth.store';
import { patientService } from '../services/patient.service';

export function EditProfileScreen(): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const [id, setId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!session?.user.id) return;
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      setId(profile.id);
      setFullName(profile.full_name);
      setPhone(profile.phone ?? '');
    };
    load().catch(() => undefined);
  }, [session?.user.id]);

  return (
    <Screen style={{ padding: spacing.md, gap: spacing.sm }}>
      <AppInput label="الاسم" value={fullName} onChangeText={setFullName} />
      <AppInput label="الجوال" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <AppButton
        title="حفظ"
        onPress={async () => {
          if (!id) return;
          await patientService.updateProfile(id, { full_name: fullName, phone });
        }}
      />
    </Screen>
  );
}
