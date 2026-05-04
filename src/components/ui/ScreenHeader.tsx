import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
  rightContent?: React.ReactNode;
}

export function ScreenHeader({ title, onBack, rightContent }: ScreenHeaderProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const borderColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const backBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <View style={[styles.header, { borderBottomColor: borderColor }]}>
      <TouchableOpacity
        onPress={onBack}
        activeOpacity={0.6}
        style={[styles.backBtn, { backgroundColor: backBg }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>
      <AppText style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.rightSlot}>
        {rightContent ?? <View style={styles.spacer} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  rightSlot: {
    width: 38,
    alignItems: 'center',
  },
  spacer: {
    width: 38,
  },
});
