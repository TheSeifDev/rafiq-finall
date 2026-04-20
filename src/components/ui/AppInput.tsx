import React from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { radius, spacing } from '../../theme';
import { useTheme } from '../../theme/useTheme';
import { AppText } from './AppText';

export function AppInput({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string }): React.JSX.Element {
  const { colors, isRTL } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <AppText variant="caption">{label}</AppText> : null}
      <TextInput
        {...props}
        style={[{ minHeight: 44, borderRadius: radius.input, borderWidth: 1, borderColor: error ? colors.danger : colors.textSecondary, paddingHorizontal: spacing.md, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }, style]}
        placeholderTextColor={colors.textSecondary}
      />
      {error ? <AppText variant="small" style={{ color: colors.danger }}>{error}</AppText> : null}
    </View>
  );
}
