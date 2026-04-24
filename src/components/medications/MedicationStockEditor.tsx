import React, { useMemo } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/AppText';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme';
import { estimateDosesPerDay } from '../../lib/medications/medicationSchedule';
import { classifyStock } from '../../lib/medications/medicationMath';

export type StockDraft = {
  quantityType: string;
  totalQuantity: string;
  remainingQuantity: string;
  refillThreshold: string;
};

const QTY_TYPES: Array<{ key: string; ar: string; en: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'pills', ar: 'أقراص/كبسولات', en: 'Pills', icon: 'cube' },
  { key: 'ml', ar: 'مل', en: 'mL', icon: 'water' },
  { key: 'uses', ar: 'استخدامات', en: 'Uses', icon: 'aperture' },
  { key: 'box', ar: 'علبة', en: 'Box', icon: 'albums' },
  { key: 'strip', ar: 'شريط', en: 'Strip', icon: 'reader' },
];

function parseNum(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return NaN;
  return n;
}

export function MedicationStockEditor({
  value,
  onChange,
  labels,
  schedule,
}: {
  value: StockDraft;
  onChange: (next: StockDraft) => void;
  labels: { title: string; quantityType: string; total: string; remaining: string; threshold: string; daysLeft: string };
  schedule: { scheduleType: string; times: unknown; timeOfDay?: string[] | null; frequencyText?: string | null };
}): React.JSX.Element {
  const { colors, darkMode, isRTL } = useTheme();
  const bg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';

  const remaining = parseNum(value.remainingQuantity);
  const threshold = parseNum(value.refillThreshold);

  const dosesPerDay = useMemo(
    () =>
      estimateDosesPerDay({
        scheduleType: schedule.scheduleType,
        times: schedule.times,
        timeOfDay: schedule.timeOfDay,
        frequencyText: schedule.frequencyText,
      }),
    [schedule],
  );

  const daysLeft = useMemo(() => {
    if (remaining === null || Number.isNaN(remaining)) return null;
    const perDay = Math.max(1, dosesPerDay);
    if (perDay <= 0) return null;
    return Math.floor(remaining / perDay);
  }, [remaining, dosesPerDay]);

  const stock = classifyStock({
    remainingQuantity: typeof remaining === 'number' && !Number.isNaN(remaining) ? remaining : null,
    refillThreshold: typeof threshold === 'number' && !Number.isNaN(threshold) ? threshold : null,
  });

  const stockColor =
    stock.severity === 'urgent' ? colors.danger : stock.severity === 'low' ? colors.warning : colors.success;

  return (
    <View style={styles.wrap}>
      <View style={[styles.titleRow, isRTL && styles.rowRTL]}>
        <AppText style={[styles.title, { color: colors.textPrimary }]}>{labels.title}</AppText>
        {daysLeft !== null && (
          <View style={[styles.daysPill, { backgroundColor: `${stockColor}14`, borderColor: `${stockColor}33` }]}>
            <Ionicons name="hourglass" size={14} color={stockColor} />
            <AppText style={[styles.daysText, { color: stockColor }]} numberOfLines={1}>
              {labels.daysLeft} {daysLeft}
            </AppText>
          </View>
        )}
      </View>

      <AppText style={[styles.sectionLabel, { color: colors.textSecondary }]}>{labels.quantityType}</AppText>
      <View style={[styles.chipGrid, isRTL && styles.rowRTL]}>
        {QTY_TYPES.map((q) => (
          <Chip
            key={q.key}
            label={isRTL ? q.ar : q.en}
            icon={q.icon}
            selected={value.quantityType === q.key}
            onPress={() => onChange({ ...value, quantityType: q.key })}
          />
        ))}
      </View>

      <View style={[styles.row, isRTL && styles.rowRTL]}>
        <Field
          label={labels.total}
          value={value.totalQuantity}
          onChangeText={(v) => onChange({ ...value, totalQuantity: v })}
          bg={bg}
          border={border}
        />
        <Field
          label={labels.remaining}
          value={value.remainingQuantity}
          onChangeText={(v) => onChange({ ...value, remainingQuantity: v })}
          bg={bg}
          border={border}
          accent={stockColor}
        />
      </View>

      <Field
        label={labels.threshold}
        value={value.refillThreshold}
        onChangeText={(v) => onChange({ ...value, refillThreshold: v })}
        bg={bg}
        border={border}
      />
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const bg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        { backgroundColor: selected ? `${colors.primary}1A` : bg, borderColor: selected ? `${colors.primary}55` : border },
      ]}
    >
      {icon && <Ionicons name={icon} size={14} color={selected ? colors.primary : colors.textSecondary} />}
      <AppText style={[styles.chipText, { color: selected ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  bg,
  border,
  accent,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  bg: string;
  border: string;
  accent?: string;
}): React.JSX.Element {
  const { colors, darkMode, isRTL } = useTheme();
  const placeholderColor = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.30)';
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <AppText style={{ fontSize: 12, fontWeight: '900', color: colors.textSecondary, opacity: 0.9 }}>{label}</AppText>
      <View style={[styles.field, { backgroundColor: bg, borderColor: accent ? `${accent}55` : border }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="0"
          placeholderTextColor={placeholderColor}
          keyboardType="numeric"
          style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  daysPill: {
    maxWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysText: {
    fontSize: 11,
    fontWeight: '900',
    opacity: 0.95,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    opacity: 0.9,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.button,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  field: {
    height: 50,
    borderRadius: radius.button,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  input: {
    fontSize: 14,
    fontWeight: '900',
  },
});

