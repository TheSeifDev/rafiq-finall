import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export function AppCard({ style, children, ...props }: ViewProps): React.JSX.Element {
  const { darkMode } = useTheme();
  const bg = darkMode ? '#1A2332' : '#FFFFFF';
  const borderColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View
      {...props}
      style={[
        styles.card,
        { backgroundColor: bg, borderColor },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
