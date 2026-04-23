import React, { useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { Screen } from '../components/ui/Screen';
import { AppCard } from '../components/ui/AppCard';
import { AppButton } from '../components/ui/AppButton';
import { AppText } from '../components/ui/AppText';
import { spacing } from '../theme';
import { useAppStore } from '../store/app.store';
import { useAuthStore } from '../store/auth.store';
import { patientService, type PatientProfile } from '../services/patient.service';

export function SettingsScreen(): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const { darkMode, language, notificationPrefs, setDarkMode, setLanguage, setNotificationPrefs } = useAppStore();
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    patientService.getProfile(session.user.id).then(setProfile).catch(() => undefined);
  }, [session?.user.id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <AppCard>
          <AppText variant="h2">البيانات الشخصية</AppText>
          <AppText>{profile?.full_name ?? '—'}</AppText>
          <AppText>{session?.user.email ?? '—'}</AppText>
          <AppText>Age: {profile?.age ?? '—'}</AppText>
          <AppText>Blood: {profile?.blood_type ?? '—'}</AppText>
          <AppText>Phone: {profile?.phone ?? '—'}</AppText>
        </AppCard>

        <AppCard>
          <AppText variant="h2">تفضيلات التطبيق</AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><AppText>الوضع الداكن</AppText><Switch value={darkMode} onValueChange={setDarkMode} /></View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <AppButton title="العربية" variant={language === 'ar' ? 'primary' : 'outlined'} onPress={() => setLanguage('ar')} />
            <AppButton title="English" variant={language === 'en' ? 'primary' : 'outlined'} onPress={() => setLanguage('en')} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}><AppText>تذكير الأدوية</AppText><Switch value={notificationPrefs.medicationReminders} onValueChange={(value) => setNotificationPrefs({ medicationReminders: value })} /></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm }}><AppText>تنبيهات المؤشرات</AppText><Switch value={notificationPrefs.vitalsAlerts} onValueChange={(value) => setNotificationPrefs({ vitalsAlerts: value })} /></View>
        </AppCard>

        <AppButton title="تسجيل الخروج" onPress={() => signOut()} />
      </ScrollView>
    </Screen>
  );
}
