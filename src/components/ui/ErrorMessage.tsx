import React from 'react';
import { AppText } from './AppText';
import { useTheme } from '../../theme/useTheme';

export function ErrorMessage({ message }: { message?: string }): React.JSX.Element | null {
  const { colors } = useTheme();
  if (!message) return null;
  return <AppText style={{ color: colors.danger }}>{message}</AppText>;
}
