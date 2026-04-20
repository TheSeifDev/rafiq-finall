import React from 'react';
import { View, type ViewProps } from 'react-native';
import { radius, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';

export function AppCard({ style, ...props }: ViewProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.card,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    />
  );
}
