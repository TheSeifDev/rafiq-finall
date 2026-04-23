import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText } from '../components/ui/AppText';
import { AppCard } from '../components/ui/AppCard';
import { AppButton } from '../components/ui/AppButton';
import { Screen } from '../components/ui/Screen';
import { spacing } from '../theme';
import { useAuthStore } from '../store/auth.store';
import { patientService } from '../services/patient.service';
import { vitalsService, type VitalsRecord } from '../services/vitals.service';
import { medicationService, type Medication } from '../services/medication.service';
import { notificationService, type AppNotification } from '../services/notification.service';
import { useNavigation } from '@react-navigation/native';

export function HomeScreen(): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const navigation = useNavigation<any>();
  const [latestVitals, setLatestVitals] = useState<VitalsRecord | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!session?.user.id) return;
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      const [vitals, meds, notifs] = await Promise.all([
        vitalsService.getLatestVitals(profile.id),
        medicationService.getMedications(profile.id),
        notificationService.getNotifications(session.user.id),
      ]);
      setLatestVitals(vitals);
      setMedications(meds);
      setNotifications(notifs.filter((item) => !item.is_read).slice(0, 3));
    };
    load().catch(() => undefined);
  }, [session?.user.id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <AppCard>
          <AppText variant="h2">آخر المؤشرات الحيوية</AppText>
          <AppText>Heart Rate: {latestVitals?.heart_rate ?? '--'} bpm</AppText>
          <AppText>BP: {latestVitals?.blood_pressure_systolic ?? '--'}/{latestVitals?.blood_pressure_diastolic ?? '--'}</AppText>
          <AppText>SpO2: {latestVitals?.oxygen_saturation ?? '--'}%</AppText>
        </AppCard>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <AppButton title="الطوارئ" onPress={() => navigation.navigate('Emergency' as never)} style={{ flexBasis: '48%' }} />
          <AppButton title="الأدوية" variant="secondary" onPress={() => navigation.navigate('Profile' as never, { screen: 'Medications' } as never)} style={{ flexBasis: '48%' }} />
          <AppButton title="المحادثة" variant="outlined" onPress={() => navigation.navigate('Chat' as never)} style={{ flexBasis: '48%' }} />
          <AppButton title="المؤشرات" variant="outlined" onPress={() => navigation.navigate('Vitals' as never)} style={{ flexBasis: '48%' }} />
        </View>

        <AppCard>
          <AppText variant="h2">أدوية اليوم</AppText>
          {medications.slice(0, 3).map((medication) => (
            <AppText key={medication.id}>{medication.name} - {medication.dosage}</AppText>
          ))}
        </AppCard>

        <AppCard>
          <AppText variant="h2">إشعارات حديثة</AppText>
          {notifications.map((item) => (
            <AppText key={item.id}>{item.title}</AppText>
          ))}
        </AppCard>
      </ScrollView>
    </Screen>
  );
}
