import React from 'react';
import { AppText } from './AppText';
import { useTheme } from '../../store/ThemeContext';
import { spacing } from '../../theme';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  const { colors } = useTheme();

  if (!message) return null;

  return (
    <AppText
      variant="caption"
      color={colors.statusError}
      style={{ marginTop: spacing.xs }}
    >
      {message}
    </AppText>
  );
}
