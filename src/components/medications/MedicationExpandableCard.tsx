import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/AppText';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme';
import { classifyStock } from '../../lib/medications/medicationMath';
import { estimateDosesPerDay, parseMedicationTimes } from '../../lib/medications/medicationSchedule';
import type { Medication } from '../../services/medication.service';

function pickAccent(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('vit') || n.includes('omega')) return '#38BDF8';
  if (n.includes('ضغط') || n.includes('pressure')) return '#F59E0B';
  if (n.includes('سكر') || n.includes('diab')) return '#A78BFA';
  if (n.includes('heart') || n.includes('قلب')) return '#FB7185';
  return '#00C2FF';
}

export function MedicationExpandableCard({
  medication,
  isRTL,
  onToggleActive,
  onDelete,
  onTakeNow,
  onRefill,
  onEdit,
  onViewHistory,
}: {
  medication: Medication;
  isRTL: boolean;
  onToggleActive: (med: Medication) => void;
  onDelete: (med: Medication) => void;
  onTakeNow: (med: Medication) => void;
  onRefill: (med: Medication) => void;
  onEdit: (med: Medication) => void;
  onViewHistory: (med: Medication) => void;
}): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const surface = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const active = medication.active ?? medication.is_active;
  const accent = pickAccent(medication.name);

  const stock = classifyStock({
    remainingQuantity: medication.remaining_quantity ?? null,
    refillThreshold: medication.refill_threshold ?? null,
  });

  const times = useMemo(
    () => parseMedicationTimes(medication.times, medication.time_of_day),
    [medication.times, medication.time_of_day],
  );

  const dosesPerDay = estimateDosesPerDay({
    scheduleType: medication.schedule_type ?? null,
    times: medication.times,
    timeOfDay: medication.time_of_day,
    frequencyText: medication.frequency ?? null,
  });

  function toggleExpanded() {
    setExpanded((v) => !v);
  }

  const stockColor =
    stock.severity === 'urgent' ? colors.danger : stock.severity === 'low' ? colors.warning : colors.success;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={toggleExpanded}
      style={[styles.card, { backgroundColor: surface, borderColor: border }]}
    >
      <View style={[styles.topRow, isRTL && styles.rowRTL]}>
        <View style={[styles.iconCircle, { backgroundColor: `${accent}22`, borderColor: `${accent}44` }]}>
          <Ionicons name="medical" size={16} color={accent} />
        </View>

        <View style={styles.main}>
          <View style={[styles.titleRow, isRTL && styles.rowRTL]}>
            <AppText style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
              {medication.name}
            </AppText>
            <View style={[styles.statusPill, { backgroundColor: `${active ? colors.success : colors.textSecondary}14` }]}>
              <AppText style={[styles.statusText, { color: active ? colors.success : colors.textSecondary }]}>
                {active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'متوقف' : 'Paused')}
              </AppText>
            </View>
          </View>

          <View style={[styles.metaRow, isRTL && styles.rowRTL]}>
            <MetaChip
              icon="flask"
              text={(medication.strength ?? medication.dosage ?? '').trim() || (isRTL ? 'بدون جرعة' : 'No strength')}
            />
            <MetaChip icon="time" text={`${dosesPerDay}${isRTL ? ' جرعات/يوم' : '/day'}`} />
            {stock.remaining !== null && (
              <MetaChip
                icon="cube"
                text={`${Math.max(0, Math.round(stock.remaining))}${isRTL ? ' متبقي' : ' left'}`}
                color={stockColor}
              />
            )}
          </View>
        </View>

        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
      </View>

      {expanded && (
        <View style={styles.expanded}>
          <Divider />

          <View style={[styles.sectionRow, isRTL && styles.rowRTL]}>
            <SectionLabel label={isRTL ? 'الجدول' : 'Schedule'} />
            <View style={[styles.chipsWrap, isRTL && styles.rowRTL]}>
              {times.slice(0, 4).map((t, idx) => (
                <MetaChip
                  key={`${t.kind}-${idx}`}
                  icon={t.kind === 'time' ? 'alarm' : 'sunny'}
                  text={t.kind === 'time' ? t.time : t.label}
                />
              ))}
              {times.length > 4 && <MetaChip icon="ellipsis-horizontal" text={isRTL ? 'المزيد' : 'More'} />}
            </View>
          </View>

          {!!medication.reason && (
            <View style={styles.block}>
              <AppText style={[styles.blockLabel, { color: colors.textSecondary }]}>
                {isRTL ? 'لماذا هذا الدواء؟' : 'Why this medication?'}
              </AppText>
              <AppText style={[styles.blockValue, { color: colors.textPrimary }]} numberOfLines={3}>
                {medication.reason}
              </AppText>
            </View>
          )}

          <View style={[styles.actions, isRTL && styles.rowRTL]}>
            <Action
              icon="checkmark-circle"
              label={isRTL ? 'تم الآن' : 'Taken'}
              tone="success"
              onPress={() => onTakeNow(medication)}
            />
            <Action
              icon="refresh-circle"
              label={isRTL ? 'تعبئة' : 'Refill'}
              tone="primary"
              onPress={() => onRefill(medication)}
            />
            <Action
              icon={active ? 'pause-circle' : 'play-circle'}
              label={active ? (isRTL ? 'إيقاف' : 'Pause') : (isRTL ? 'تشغيل' : 'Resume')}
              tone="warning"
              onPress={() => onToggleActive(medication)}
            />
            <Action icon="create" label={isRTL ? 'تعديل' : 'Edit'} tone="primary" onPress={() => onEdit(medication)} />
            <Action
              icon="time"
              label={isRTL ? 'السجل' : 'History'}
              tone="primary"
              onPress={() => onViewHistory(medication)}
            />
            <Action icon="trash" label={isRTL ? 'حذف' : 'Delete'} tone="danger" onPress={() => onDelete(medication)} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function Divider(): React.JSX.Element {
  const { darkMode } = useTheme();
  return <View style={{ height: 1, backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />;
}

function SectionLabel({ label }: { label: string }): React.JSX.Element {
  const { colors } = useTheme();
  return <AppText style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</AppText>;
}

function MetaChip({
  icon,
  text,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color?: string;
}): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const bg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const c = color ?? colors.textSecondary;
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <Ionicons name={icon} size={14} color={c} />
      <AppText style={[styles.chipText, { color: colors.textPrimary }]} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const bg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const accent =
    tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.action, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons name={icon} size={18} color={accent} />
      <AppText style={[styles.actionText, { color: colors.textPrimary }]} numberOfLines={1}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 180,
  },
  expanded: {
    gap: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '900',
    opacity: 0.9,
  },
  chipsWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
  },
  block: {
    gap: 6,
  },
  blockLabel: {
    fontSize: 12,
    fontWeight: '900',
    opacity: 0.9,
  },
  blockValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  action: {
    flexGrow: 1,
    minWidth: 104,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '900',
    flex: 1,
    minWidth: 0,
  },
});
