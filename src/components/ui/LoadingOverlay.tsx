import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';

export function LoadingOverlay({ text = 'Loading...' }: { text?: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText style={{ marginTop: 8, color: '#fff' }}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00000055',
  },
});
