import React from 'react';
import { Text, type TextProps } from 'react-native';
import { typography } from '../../theme';
import { useTheme } from '../../theme/useTheme';

type Variant = keyof typeof typography;

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }): React.JSX.Element {
  const { colors, isRTL } = useTheme();
  return <Text {...props} style={[typography[variant], { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, style]} />;
}
