import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../ui/AppText';
import { useTheme } from '../../theme/useTheme';
import { radius, spacing } from '../../theme';
import { toArabicIndic } from '../../constants/translations';

type StatTone = 'primary' | 'success' | 'warning' | 'danger';

export type MedicationDashboardStat = {
  key: string;
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone: StatTone;
};

function useAnimatedCount(value: number): Animated.Value {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [anim, value]);

  return anim;
}

function toneColor(colors: ReturnType<typeof useTheme>['colors'], tone: StatTone): string {
  if (tone === 'success') return colors.success;
  if (tone === 'warning') return colors.warning;
  if (tone === 'danger') return colors.danger;
  return colors.primary;
}

export function MedicationDashboardRow({
  stats,
}: {
  stats: MedicationDashboardStat[];
}): React.JSX.Element {
  const { colors, darkMode, isRTL } = useTheme();
  const surface = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const border = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  const layoutStats = useMemo(() => stats.slice(0, 5), [stats]);

  return (
    <View style={[styles.wrap, isRTL && styles.wrapRTL]}>
      {layoutStats.map((s) => (
        <StatTile
          key={s.key}
          stat={s}
          surface={surface}
          border={border}
          accent={toneColor(colors, s.tone)}
          isRTL={isRTL}
        />
      ))}
    </View>
  );
}

function StatTile({
  stat,
  surface,
  border,
  accent,
  isRTL,
}: {
  stat: MedicationDashboardStat;
  surface: string;
  border: string;
  accent: string;
  isRTL: boolean;
}): React.JSX.Element {
  const { colors } = useTheme();
  const anim = useAnimatedCount(stat.value);
  const [text, setText] = React.useState('0');

  useEffect(() => {
    const sub = anim.addListener(({ value }) => {
      const rounded = Math.round(value);
      setText(String(rounded));
    });
    return () => {
      anim.removeListener(sub);
    };
  }, [anim]);

  const display = isRTL ? toArabicIndic(text) : text;

  return (
    <View style={[styles.tile, { backgroundColor: surface, borderColor: border }]}>
      <View style={[styles.tileTop, isRTL && styles.rowRTL]}>
        <View style={[styles.iconPill, { backgroundColor: `${accent}1A`, borderColor: `${accent}33` }]}>
          <Ionicons name={stat.icon} size={16} color={accent} />
        </View>
        <AppText style={[styles.value, { color: colors.textPrimary }]}>{display}</AppText>
      </View>
      <AppText style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {stat.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  wrapRTL: {
    flexDirection: 'row-reverse',
  },
  tile: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 8,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  iconPill: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.9,
  },
});

