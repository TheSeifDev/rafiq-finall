/**
 * Quick Reply Button Component
 * Suggestion chips for chat input
 */

import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

interface QuickReplyProps {
  label: string;
  onPress: () => void;
  isRTL?: boolean;
}

export function QuickReply({ label, onPress, isRTL = false }: QuickReplyProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        isRTL && styles.containerRTL,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.label, isRTL && styles.labelRTL]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f4f8',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  containerRTL: {
    marginRight: 0,
    marginLeft: 8,
  },
  pressed: {
    backgroundColor: '#e0e6ed',
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 14,
    color: '#4a6fa5',
    fontWeight: '500',
  },
  labelRTL: {
    textAlign: 'right',
  },
});

export default QuickReply;