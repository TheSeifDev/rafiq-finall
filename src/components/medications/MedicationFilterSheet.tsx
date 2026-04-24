import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/AppText';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme';

export type MedicationFilters = {
  onlyActive: boolean;
  lowStockOnly: boolean;
  forms: string[];
  reasons: string[];
};

const FORM_OPTIONS = ['tablet', 'capsule', 'syrup', 'injection', 'spray', 'drops', 'cream', 'inhaler'] as const;
const REASON_OPTIONS = ['pain', 'blood_pressure', 'diabetes', 'memory', 'heart', 'sleep', 'digestion', 'vitamin', 'other'] as const;

function toggle(list: string[], value: string): string[] {
  const set = new Set(list);
  if (set.has(value)) set.delete(value);
  else set.add(value);
  return Array.from(set);
}

export function MedicationFilterSheet({
  visible,
  onClose,
  value,
  onChange,
  labels,
}: {
  visible: boolean;
  onClose: () => void;
  value: MedicationFilters;
  onChange: (next: MedicationFilters) => void;
  labels: {
    title: string;
    onlyActive: string;
    lowStockOnly: string;
    forms: string;
    reasons: string;
    reset: string;
    done: string;
    formLabels: Record<string, string>;
    reasonLabels: Record<string, string>;
  };
}): React.JSX.Element {
  const { colors, darkMode, isRTL } = useTheme();
  const overlay = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    overlay.setValue(0);
    slide.setValue(0);
    Animated.parallel([
      Animated.timing(overlay, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [overlay, slide, visible]);

  const surface = darkMode ? 'rgba(30,41,59,0.98)' : 'rgba(255,255,255,0.98)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const formOptions = useMemo(() => [...FORM_OPTIONS], []);
  const reasonOptions = useMemo(() => [...REASON_OPTIONS], []);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY }], backgroundColor: surface, borderColor: border }]}>
          <View style={[styles.header, isRTL && styles.rowRTL]}>
            <AppText style={[styles.title, { color: colors.textPrimary }]}>{labels.title}</AppText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>{labels.onlyActive}</AppText>
            <Chip
              label={labels.onlyActive}
              selected={value.onlyActive}
              onPress={() => onChange({ ...value, onlyActive: !value.onlyActive })}
            />
          </View>

          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>{labels.lowStockOnly}</AppText>
            <Chip
              label={labels.lowStockOnly}
              selected={value.lowStockOnly}
              onPress={() => onChange({ ...value, lowStockOnly: !value.lowStockOnly })}
              tone="warning"
            />
          </View>

          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>{labels.forms}</AppText>
            <View style={[styles.chipGrid, isRTL && styles.gridRTL]}>
              {formOptions.map((f) => (
                <Chip
                  key={f}
                  label={labels.formLabels[f] ?? f}
                  selected={value.forms.includes(f)}
                  onPress={() => onChange({ ...value, forms: toggle(value.forms, f) })}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>{labels.reasons}</AppText>
            <View style={[styles.chipGrid, isRTL && styles.gridRTL]}>
              {reasonOptions.map((r) => (
                <Chip
                  key={r}
                  label={labels.reasonLabels[r] ?? r}
                  selected={value.reasons.includes(r)}
                  onPress={() => onChange({ ...value, reasons: toggle(value.reasons, r) })}
                />
              ))}
            </View>
          </View>

          <View style={[styles.footer, isRTL && styles.rowRTL]}>
            <TouchableOpacity
              onPress={() => onChange({ onlyActive: false, lowStockOnly: false, forms: [], reasons: [] })}
              style={[styles.footerBtn, { borderColor: border }]}
              activeOpacity={0.8}
            >
              <AppText style={[styles.footerBtnText, { color: colors.textPrimary }]}>{labels.reset}</AppText>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={[styles.primaryBtn, { backgroundColor: colors.primary }]} activeOpacity={0.85}>
              <AppText style={styles.primaryBtnText}>{labels.done}</AppText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function Chip({
  label,
  selected,
  onPress,
  tone,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: 'warning';
}): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const bg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const accent = tone === 'warning' ? colors.warning : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? `${accent}1A` : bg,
          borderColor: selected ? `${accent}55` : border,
        },
      ]}
    >
      <AppText style={[styles.chipText, { color: selected ? accent : colors.textPrimary }]} numberOfLines={1}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.9,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridRTL: {
    flexDirection: 'row-reverse',
  },
  chip: {
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});

