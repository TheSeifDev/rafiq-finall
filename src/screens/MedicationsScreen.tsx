import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppButton } from '../components/ui/AppButton';
import { AppCard } from '../components/ui/AppCard';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { spacing } from '../theme';
import { useAuthStore } from '../store/auth.store';
import { medicationService, type Medication } from '../services/medication.service';
import { patientService } from '../services/patient.service';

const baseForm = { name: '', dosage: '', frequency: 'daily', instructions: '' };

export function MedicationsScreen(): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const [items, setItems] = useState<Medication[]>([]);
  const [form, setForm] = useState(baseForm);

  const load = async () => {
    if (!session?.user.id) return;
    const profile = await patientService.getProfile(session.user.id);
    if (!profile) return;
    const data = await medicationService.getMedications(profile.id);
    setItems(data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [session?.user.id]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <AppCard>
          <AppText variant="h2">إضافة دواء</AppText>
          <View style={{ gap: spacing.sm }}>
            <AppInput label="Name" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
            <AppInput label="Dosage" value={form.dosage} onChangeText={(value) => setForm((current) => ({ ...current, dosage: value }))} />
            <AppInput label="Frequency" value={form.frequency} onChangeText={(value) => setForm((current) => ({ ...current, frequency: value }))} />
            <AppInput label="Instructions" value={form.instructions} onChangeText={(value) => setForm((current) => ({ ...current, instructions: value }))} />
            <AppButton
              title="حفظ"
              onPress={async () => {
                if (!session?.user.id) return;
                const profile = await patientService.getProfile(session.user.id);
                if (!profile) return;
                await medicationService.addMedication({
                  patient_id: profile.id,
                  name: form.name,
                  dosage: form.dosage,
                  frequency: form.frequency,
                  time_of_day: ['morning'],
                  start_date: new Date().toISOString().slice(0, 10),
                  end_date: null,
                  instructions: form.instructions,
                  is_active: true,
                });
                setForm(baseForm);
                await load();
              }}
            />
          </View>
        </AppCard>

        <AppCard>
          <AppText variant="h2">قائمة الأدوية</AppText>
          {items.length === 0 ? <EmptyState title="No medications added" /> : items.map((item) => <AppText key={item.id}>{item.name} • {item.dosage} • {item.frequency}</AppText>)}
        </AppCard>
      </ScrollView>
    </Screen>
  );
}
