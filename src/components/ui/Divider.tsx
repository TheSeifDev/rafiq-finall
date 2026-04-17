import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../store/ThemeContext';
import { spacing } from '../../theme';

export function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
    marginVertical: spacing.md,
  },
});
