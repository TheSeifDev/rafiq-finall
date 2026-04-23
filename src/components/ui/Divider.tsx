import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../theme';

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
    marginVertical: spacing.md,
    backgroundColor: 'rgba(148, 163, 184, 0.28)',
  },
});
