import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { typography, TypographyVariant } from '../../theme';
import { useTheme } from '../../store/ThemeContext';

interface AppTextProps {
  variant?: TypographyVariant;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  align?: TextStyle['textAlign'];
}

export function AppText({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
  align = 'right',
}: AppTextProps) {
  const { colors } = useTheme();

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        typography[variant],
        { color: color ?? colors.text, textAlign: align },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
