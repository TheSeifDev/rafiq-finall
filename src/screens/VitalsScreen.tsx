import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Screen } from '../components/ui/Screen';
import { AppCard } from '../components/ui/AppCard';
import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { spacing } from '../theme';
import { useAuthStore } from '../store/auth.store';
import { patientService } from '../services/patient.service';
import { vitalsService, type VitalsRecord } from '../services/vitals.service';
import { BluetoothService } from '../services/bluetooth.service';

export function VitalsScreen(): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const [records, setRecords] = useState<VitalsRecord[]>([]);
  const [heartRate, setHeartRate] = useState('');
  const [connecting, setConnecting] = useState(false);

  const chart = useMemo(() => {
    const points = records.slice(0, 7).reverse();
    return {
      labels: points.map((item) => item.recorded_at.slice(5, 10)),
      datasets: [{ data: points.map((item) => item.heart_rate ?? 0) }],
    };
  }, [records]);

  const load = async () => {
    if (!session?.user.id) return;
    const profile = await patientService.getProfile(session.user.id);
    if (!profile) return;
    const data = await vitalsService.getVitalsHistory(profile.id);
    setRecords(data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [session?.user.id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <AppCard>
          <AppText variant="h2">Smartwatch</AppText>
          <AppButton
            title={connecting ? 'جارٍ البحث...' : 'Connect Smartwatch'}
            loading={connecting}
            onPress={async () => {
              setConnecting(true);
              const service = new BluetoothService();
              const devices = await service.scanForDevices();
              if (devices[0]) await service.connectToDevice(devices[0].id);
              setConnecting(false);
            }}
          />
        </AppCard>

        <AppCard>
          <AppText variant="h2">إضافة قراءة يدوية</AppText>
          <View style={{ gap: spacing.sm }}>
            <AppInput label="Heart Rate" value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" />
            <AppButton
              title="حفظ القراءة"
              onPress={async () => {
                if (!session?.user.id) return;
                const profile = await patientService.getProfile(session.user.id);
                if (!profile) return;
                await vitalsService.saveVitals({
                  patient_id: profile.id,
                  heart_rate: Number(heartRate),
                  blood_pressure_systolic: null,
                  blood_pressure_diastolic: null,
                  oxygen_saturation: null,
                  temperature: null,
                  source: 'manual',
                  recorded_at: new Date().toISOString(),
                });
                setHeartRate('');
                await load();
              }}
            />
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="h2">آخر ٧ أيام</AppText>
          {chart.datasets[0].data.length > 0 ? (
            <LineChart data={chart} width={320} height={220} chartConfig={{ color: () => '#0077C8', labelColor: () => '#64748B' }} bezier />
          ) : (
            <AppText>لا توجد بيانات كافية للرسم البياني.</AppText>
          )}
        </AppCard>
      </ScrollView>
    </Screen>
  );
}
