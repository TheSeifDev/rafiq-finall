import React from 'react';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { radius, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost';

export function AppButton({ title, variant = 'primary', loading, style, ...props }: PressableProps & { title: string; variant?: Variant; loading?: boolean }): React.JSX.Element {
  const { colors } = useTheme();
  const background = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.secondary : 'transparent';
  const textColor = variant === 'ghost' ? colors.primary : '#fff';

  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={[{ minHeight: 44, borderRadius: radius.button, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', backgroundColor: background }, style]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <AppText style={{ color: textColor, fontWeight: '700' }}>{title}</AppText>}
    </Pressable>
  );
}
