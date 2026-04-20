import React from 'react';
import { View } from 'react-native';
import { AppButton } from './AppButton';
import { AppText } from './AppText';

export function EmptyState({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }): React.JSX.Element {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
      <AppText>{title}</AppText>
      {actionLabel && onAction ? <AppButton title={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}
