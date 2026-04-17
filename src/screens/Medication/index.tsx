import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, StyleSheet, Animated, FlatList, TouchableOpacity, Modal,
  TextInput, Keyboard, TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, AppButton, Spacer, LoadingOverlay, EmptyState, ErrorMessage } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { patientService } from '../../services/patient.service';
import { medicationService } from '../../services/medication.service';
import { spacing, radius, typography, shadows } from '../../theme';
import type { Medication } from '../../types/database';

// ---------- Medication Card ----------
function MedCard({
  item,
  colors,
  onToggle,
  onDelete,
}: {
  item: Medication;
  colors: ReturnType<typeof useTheme>['colors'];
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <AppCard style={styles.medCard}>
      <View style={styles.medRow}>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <AppText variant="label">{item.med_name}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {item.dosage}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            ⏰ {item.reminder_time}
          </AppText>
        </View>
        <View style={[styles.medIcon, { backgroundColor: item.is_active ? colors.statusSuccess + '18' : colors.textDisabled + '18' }]}>
          <MaterialCommunityIcons
            name={item.is_active ? 'pill' : 'pill-off'}
            size={24}
            color={item.is_active ? colors.statusSuccess : colors.textDisabled}
          />
        </View>
      </View>
      <View style={styles.medActions}>
        <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.actionBtn}>
          <MaterialCommunityIcons name="delete-outline" size={20} color={colors.statusError} />
          <AppText variant="caption" color={colors.statusError} style={{ marginRight: 4 }}>حذف</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onToggle(item.id, !item.is_active)} style={styles.actionBtn}>
          <MaterialCommunityIcons
            name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
            size={20}
            color={colors.primary}
          />
          <AppText variant="caption" color={colors.primary} style={{ marginRight: 4 }}>
            {item.is_active ? 'إيقاف' : 'تفعيل'}
          </AppText>
        </TouchableOpacity>
      </View>
    </AppCard>
  );
}

// ---------- Medication Screen ----------
export default function MedicationScreen() {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [medName, setMedName] = useState('');
  const [dosage, setDosage] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const loadMeds = useCallback(async () => {
    if (!user) return;
    try {
      const pId = await patientService.getPatientId(user.id);
      setPatientId(pId);
      if (pId) {
        const data = await medicationService.getMedications(pId);
        setMeds(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMeds();
  }, [loadMeds]);

  const handleAdd = async () => {
    setError('');
    if (!medName.trim() || !dosage.trim() || !reminderTime.trim()) {
      setError('يرجى ملء جميع الحقول');
      return;
    }
    if (!patientId) return;

    setSubmitting(true);
    try {
      const result = await medicationService.addMedication({
        patient_id: patientId,
        med_name: medName.trim(),
        dosage: dosage.trim(),
        reminder_time: reminderTime.trim(),
      });
      if (result.error) {
        setError(result.error);
      } else {
        setShowModal(false);
        setMedName('');
        setDosage('');
        setReminderTime('');
        loadMeds();
      }
    } catch {
      setError('حدث خطأ. يرجى المحاولة لاحقاً');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await medicationService.toggleMedication(id, active);
    loadMeds();
  };

  const handleDelete = async (id: string) => {
    await medicationService.deleteMedication(id);
    loadMeds();
  };

  if (loading) {
    return (
      <Screen>
        <LoadingOverlay label="جاري تحميل الأدوية..." />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="plus" size={22} color="#FFF" />
          </TouchableOpacity>
          <AppText variant="h2">الأدوية</AppText>
        </View>

        <FlatList
          data={meds}
          renderItem={({ item }) => (
            <MedCard item={item} colors={colors} onToggle={handleToggle} onDelete={handleDelete} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon="pill-off" message="لا توجد أدوية مسجلة بعد" />}
        />
      </Animated.View>

      {/* Add Medication Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <AppText variant="h3">إضافة دواء</AppText>
              </View>

              <Spacer size="lg" />

              {error ? <><ErrorMessage message={error} /><Spacer size="md" /></> : null}

              <AppText variant="label" style={{ marginBottom: spacing.xs }}>اسم الدواء</AppText>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? colors.surface : colors.background }]}
                placeholder="مثلاً: أسبرين"
                placeholderTextColor={colors.textSecondary + '80'}
                textAlign="right"
                value={medName}
                onChangeText={setMedName}
              />

              <AppText variant="label" style={{ marginBottom: spacing.xs, marginTop: spacing.md }}>الجرعة</AppText>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? colors.surface : colors.background }]}
                placeholder="مثلاً: 81 مجم"
                placeholderTextColor={colors.textSecondary + '80'}
                textAlign="right"
                value={dosage}
                onChangeText={setDosage}
              />

              <AppText variant="label" style={{ marginBottom: spacing.xs, marginTop: spacing.md }}>وقت التذكير</AppText>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: isDarkMode ? colors.surface : colors.background }]}
                placeholder="مثلاً: 8:00 صباحاً"
                placeholderTextColor={colors.textSecondary + '80'}
                textAlign="right"
                value={reminderTime}
                onChangeText={setReminderTime}
              />

              <Spacer size="lg" />

              <AppButton
                label="إضافة"
                onPress={handleAdd}
                loading={submitting}
                disabled={submitting}
                size="lg"
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  medCard: {
    marginBottom: spacing.sm,
  },
  medRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  medIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
    ...typography.body,
  },
});
