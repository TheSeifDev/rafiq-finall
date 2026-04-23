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
import { patientService, type PatientProfile } from '../services/patient.service';
import { translations } from '../constants/translations';
import type { ProfileStackScreenProps } from '../navigation/types';

type Props = ProfileStackScreenProps<'EditProfile'>;

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CONDITION_TYPES_AR = [
  'ألزهايمر', 'خرف', 'باركنسون', 'خطر سقوط',
  'قلب', 'سكري', 'رعاية عامة', 'أخرى',
];
const CONDITION_TYPES_EN = [
  'Alzheimer\'s', 'Dementia', 'Parkinson\'s', 'Mobility Risk',
  'Cardiac', 'Diabetes', 'Elderly General Care', 'Custom',
];

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const RISK_LEVELS_AR = ['منخفض', 'متوسط', 'مرتفع', 'حرج'];

// ── Pill selector ──
function PillSelector({
  options,
  selected,
  onSelect,
  colors,
  darkMode,
}: {
  options: string[];
  selected: string | null;
  onSelect: (val: string) => void;
  colors: any;
  darkMode: boolean;
}) {
  return (
    <View style={styles.pillRow}>
      {options.map((opt) => {
        const isActive = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            activeOpacity={0.7}
            onPress={() => onSelect(opt)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive
                  ? colors.primary + '18'
                  : (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                borderColor: isActive ? colors.primary + '40' : 'transparent',
              },
            ]}
          >
            <AppText
              style={[
                styles.pillText,
                { color: isActive ? colors.primary : colors.textSecondary },
              ]}
            >
              {opt}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Section title ──
function SectionTitle({ title, icon, colors }: { title: string; icon: string; colors: any }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Ionicons name={icon as any} size={18} color={colors.primary} />
      <AppText style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</AppText>
    </View>
  );
}

export function EditProfileScreen({ navigation }: Props): React.JSX.Element {
  const session = useAuthStore((s) => s.session);
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language] as any;
  const isAr = language === 'ar';

  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [bloodType, setBloodType] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [conditionType, setConditionType] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!session?.user.id) return;
      const profile = await patientService.getProfile(session.user.id);
      if (!profile) {
        setLoading(false);
        return;
      }
      setProfileId(profile.id);
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setAge(profile.age?.toString() ?? '');
      setGender(profile.gender);
      setBloodType(profile.blood_type);
      setAddress(profile.address ?? '');
      setEmergencyContact(profile.emergency_contact ?? '');
      setConditionType(profile.condition_type);
      setRiskLevel(profile.risk_level);
      setNotes(profile.notes ?? '');
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [session?.user.id]);

  const handleSave = useCallback(async () => {
    if (!profileId) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const payload: Partial<PatientProfile> = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        age: age ? parseInt(age, 10) : null,
        gender,
        blood_type: bloodType,
        address: address.trim() || null,
        emergency_contact: emergencyContact.trim() || null,
        condition_type: conditionType,
        risk_level: riskLevel,
        notes: notes.trim() || null,
      };
      await patientService.updateProfile(profileId, payload);
      setStatusMsg({ type: 'success', text: t.saved });
      // Auto-clear success after 2s
      setTimeout(() => setStatusMsg(null), 2000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message ?? t.saveFailed });
    } finally {
      setSaving(false);
    }
  }, [profileId, fullName, phone, age, gender, bloodType, address, emergencyContact, conditionType, riskLevel, notes, t]);

  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.80)' : 'rgba(255, 255, 255, 0.92)';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title={t.editProfile} onBack={() => navigation.goBack()} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={t.editProfile}
        onBack={() => navigation.goBack()}
        rightContent={
          saving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <TouchableOpacity onPress={handleSave} activeOpacity={0.6}>
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          )
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
          {/* ── Status Banner ── */}
          {statusMsg && (
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor: statusMsg.type === 'success' ? colors.success + '15' : colors.danger + '15',
                  borderColor: statusMsg.type === 'success' ? colors.success + '30' : colors.danger + '30',
                },
              ]}
            >
              <Ionicons
                name={statusMsg.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={statusMsg.type === 'success' ? colors.success : colors.danger}
              />
              <AppText
                style={[
                  styles.statusText,
                  { color: statusMsg.type === 'success' ? colors.success : colors.danger },
                ]}
              >
                {statusMsg.text}
              </AppText>
            </View>
          )}

          {/* ── Personal Info ── */}
          <View style={[styles.section, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <SectionTitle title={t.personalInfo} icon="person-outline" colors={colors} />
            <AppInput label={t.fullName} value={fullName} onChangeText={setFullName} />
            <AppInput label={t.email} value={session?.user.email ?? ''} onChangeText={() => {}} editable={false} />
            <AppInput label={t.phone} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <AppInput label={t.age} value={age} onChangeText={setAge} keyboardType="numeric" />
            <AppInput label={t.addressLabel} value={address} onChangeText={setAddress} />
            <AppInput label={t.emergencyContact} value={emergencyContact} onChangeText={setEmergencyContact} keyboardType="phone-pad" />

            <AppText style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.gender}</AppText>
            <PillSelector
              options={[t.male, t.female]}
              selected={
                gender === 'male' ? t.male : gender === 'female' ? t.female : null
              }
              onSelect={(val) => setGender(val === t.male ? 'male' : 'female')}
              colors={colors}
              darkMode={darkMode}
            />

            <AppText style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.bloodType}</AppText>
            <PillSelector
              options={BLOOD_TYPES}
              selected={bloodType}
              onSelect={setBloodType}
              colors={colors}
              darkMode={darkMode}
            />
          </View>

          {/* ── Patient Info ── */}
          <View style={[styles.section, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <SectionTitle title={t.patientInfo} icon="medical-outline" colors={colors} />

            <AppText style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.conditionType}</AppText>
            <PillSelector
              options={isAr ? CONDITION_TYPES_AR : CONDITION_TYPES_EN}
              selected={conditionType}
              onSelect={setConditionType}
              colors={colors}
              darkMode={darkMode}
            />

            <AppText style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t.riskLevel}</AppText>
            <PillSelector
              options={isAr ? RISK_LEVELS_AR : RISK_LEVELS}
              selected={riskLevel}
              onSelect={setRiskLevel}
              colors={colors}
              darkMode={darkMode}
            />

            <AppInput
              label={t.notesLabel}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── Save Button ── */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <AppText style={styles.saveBtnText}>{t.save}</AppText>
              </>
            )}
          </TouchableOpacity>

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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Status ──
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // ── Sections ──
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  // ── Pills ──
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // ── Save ──
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: 16,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
