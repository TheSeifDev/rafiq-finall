import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { medicationService, type Medication } from '../services/medication.service';
import { patientService } from '../services/patient.service';
import { translations } from '../constants/translations';
import type { ProfileStackScreenProps } from '../navigation/types';

type Props = ProfileStackScreenProps<'Medications'>;

const baseForm = { name: '', dosage: '', frequency: 'daily', instructions: '' };

export function MedicationsScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language] as any;
  const isAr = language === 'ar';

  const [items, setItems] = useState<Medication[]>([]);
  const [form, setForm] = useState(baseForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.80)' : 'rgba(255, 255, 255, 0.92)';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const dividerColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      const data = await medicationService.getMedications(profile.id);
      setItems(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    if (!session?.user.id || !form.name.trim()) return;
    setSaving(true);
    try {
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) return;
      await medicationService.addMedication({
        patient_id: profile.id,
        name: form.name.trim(),
        dosage: form.dosage.trim(),
        frequency: form.frequency.trim(),
        time_of_day: ['morning'],
        start_date: new Date().toISOString().slice(0, 10),
        end_date: null,
        instructions: form.instructions.trim() || null,
        is_active: true,
      });
      setForm(baseForm);
      setShowForm(false);
      await load();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [session?.user.id, form, load]);

  return (
    <Screen>
      <ScreenHeader
        title={t.medications}
        onBack={() => navigation.goBack()}
        rightContent={
          <TouchableOpacity onPress={() => setShowForm(!showForm)} activeOpacity={0.6}>
            <Ionicons name={showForm ? 'close-circle' : 'add-circle'} size={28} color={colors.primary} />
          </TouchableOpacity>
        }
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Add Form ── */}
          {showForm && (
            <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
              <View style={styles.formHeader}>
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <AppText style={[styles.formTitle, { color: colors.textPrimary }]}>
                  {isAr ? 'إضافة دواء' : 'Add Medication'}
                </AppText>
              </View>
              <AppInput
                label={isAr ? 'اسم الدواء' : 'Name'}
                value={form.name}
                onChangeText={(v) => setForm((c) => ({ ...c, name: v }))}
              />
              <AppInput
                label={isAr ? 'الجرعة' : 'Dosage'}
                value={form.dosage}
                onChangeText={(v) => setForm((c) => ({ ...c, dosage: v }))}
              />
              <AppInput
                label={isAr ? 'التكرار' : 'Frequency'}
                value={form.frequency}
                onChangeText={(v) => setForm((c) => ({ ...c, frequency: v }))}
              />
              <AppInput
                label={isAr ? 'تعليمات' : 'Instructions'}
                value={form.instructions}
                onChangeText={(v) => setForm((c) => ({ ...c, instructions: v }))}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAdd}
                disabled={saving || !form.name.trim()}
                style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || !form.name.trim() ? 0.5 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <AppText style={styles.saveBtnText}>{t.save}</AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Medications List ── */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : items.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
              <Ionicons name="medical-outline" size={40} color={colors.textSecondary + '40'} />
              <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {isAr ? 'لا توجد أدوية مسجلة' : 'No medications added'}
              </AppText>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowForm(true)}
                style={[styles.emptyBtn, { borderColor: colors.primary + '30' }]}
              >
                <Ionicons name="add" size={18} color={colors.primary} />
                <AppText style={[styles.emptyBtnText, { color: colors.primary }]}>
                  {isAr ? 'أضف دواء' : 'Add medication'}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
              {items.map((med, i) => (
                <View
                  key={med.id}
                  style={[
                    styles.medRow,
                    i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: dividerColor },
                  ]}
                >
                  <View style={[styles.medDot, { backgroundColor: med.is_active ? colors.success : colors.textSecondary }]} />
                  <View style={styles.medInfo}>
                    <AppText style={[styles.medName, { color: colors.textPrimary }]}>{med.name}</AppText>
                    <AppText style={[styles.medMeta, { color: colors.textSecondary }]}>
                      {med.dosage} · {med.frequency}
                    </AppText>
                    {med.instructions && (
                      <AppText style={[styles.medInstr, { color: colors.textSecondary }]}>{med.instructions}</AppText>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: (med.is_active ? colors.success : colors.textSecondary) + '12' }]}>
                    <AppText style={[styles.statusText, { color: med.is_active ? colors.success : colors.textSecondary }]}>
                      {med.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'متوقف' : 'Inactive')}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: spacing['2xl'] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  loadingWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: 14,
    marginTop: spacing.xs,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // ── Empty state ──
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // ── Med rows ──
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  medDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  medInfo: {
    flex: 1,
    gap: 2,
  },
  medName: {
    fontSize: 15,
    fontWeight: '600',
  },
  medMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  medInstr: {
    fontSize: 11,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
