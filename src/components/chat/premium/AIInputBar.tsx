/**
 * AI Input Bar
 * Premium modern chat input with glassmorphism
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, StyleSheet, Pressable, Animated, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIInputBarProps {
  onSend: (message: string) => void;
  isRTL?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function AIInputBar({
  onSend,
  isRTL = false,
  disabled = false,
  placeholder = 'Ask about your health...',
}: AIInputBarProps) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const sendAnim = useRef(new Animated.Value(1)).current;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    Animated.sequence([
      Animated.spring(sendAnim, { toValue: 0.7, useNativeDriver: true, speed: 100 }),
      Animated.spring(sendAnim, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 6 }),
    ]).start();

    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  }, [text, disabled, onSend, sendAnim]);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputFocused,
          disabled && styles.inputDisabled,
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={1000}
          editable={!disabled}
          style={[
            styles.input,
            isRTL && styles.inputRTL,
            text.length > 0 && styles.inputWithText,
          ]}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        <Animated.View style={[styles.sendButton, { transform: [{ scale: sendAnim }] }]}>
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={({ pressed }) => [
              styles.sendPressable,
              pressed && styles.sendPressed,
              !canSend && styles.sendDisabled,
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={canSend ? '#fff' : '#94a3b8'}
              style={isRTL ? { transform: [{ rotate: '180deg' }] } : {}}
            />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 4,
    paddingVertical: 6,
    minHeight: 48,
    maxHeight: 120,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  inputFocused: {
    borderColor: '#4a6fa5',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  inputRTL: {
    textAlign: 'right',
  },
  inputWithText: {
    color: '#1e293b',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4a6fa5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    marginRight: 4,
  },
  sendPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendPressed: {
    opacity: 0.8,
  },
  sendDisabled: {
    backgroundColor: '#e2e8f0',
  },
});

export default AIInputBar;