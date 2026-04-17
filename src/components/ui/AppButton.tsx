import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../../store/ThemeContext';
import { spacing, radius } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<ButtonSize, { height: number; px: number; fontSize: number }> = {
  sm: { height: 40, px: spacing.md, fontSize: 14 },
  md: { height: 52, px: spacing.lg, fontSize: 16 },
  lg: { height: 62, px: spacing.xl, fontSize: 18 },
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: AppButtonProps) {
  const { colors } = useTheme();
  const sizeStyle = sizeMap[size];

  const getVariantStyles = (): { bg: string; textColor: string; borderColor?: string } => {
    switch (variant) {
      case 'primary':
        return { bg: colors.primary, textColor: colors.textInverse };
      case 'secondary':
        return { bg: 'transparent', textColor: colors.text, borderColor: colors.border };
      case 'ghost':
        return { bg: 'transparent', textColor: colors.primary };
      case 'destructive':
        return { bg: colors.statusError, textColor: colors.textInverse };
    }
  };

  const variantStyle = getVariantStyles();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.px,
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.borderColor,
          borderWidth: variantStyle.borderColor ? 1.5 : 0,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.textColor} />
      ) : (
        <AppText
          variant="label"
          color={variantStyle.textColor}
          align="center"
          style={{ fontSize: sizeStyle.fontSize, fontWeight: '700' }}
        >
          {label}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
