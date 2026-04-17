import React from 'react';
import { View } from 'react-native';
import { spacing } from '../../theme';

type SpacingKey = keyof typeof spacing;

interface SpacerProps {
  size?: SpacingKey;
}

export function Spacer({ size = 'md' }: SpacerProps) {
  return <View style={{ height: spacing[size] }} />;
}
