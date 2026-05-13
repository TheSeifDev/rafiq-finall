/**
 * AI Chat Composer
 * Modern floating input with premium design
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIChatComposerProps {
  onSend: (message: string) => void;
  isRTL?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function AIChatComposer({
  onSend,
  isRTL = false,
  disabled = false,
  placeholder = 'Ask about your health...',
}: AIChatComposerProps) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const sendScale = useRef(new Animated.Value(1)).current;

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    // Animate send button
    Animated.sequence([
      Animated.spring(sendScale, {
        toValue: 0.8,
        useNativeDriver: true,
        speed: 100,
      }),
      Animated.spring(sendScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 80,
        bounciness: 6,
      }),
    ]).start();

    onSend(trimmed);
    setText('');
    Keyboard.dismiss();
  }, [text, disabled, onSend, sendScale]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View
        style={[
          styles.composer,
          isFocused && styles.composerFocused,
          isRTL && styles.composerRTL,
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={handleFocus}
          onBlur={handleBlur}
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

        <Animated.View
          style={[
            styles.sendButton,
            disabled && styles.sendButtonDisabled,
            { transform: [{ scale: sendScale }] },
          ]}
        >
          <Pressable
            onPress={handleSend}
            disabled={disabled || !text.trim()}
            style={styles.sendPressable}
          >
            <Ionicons
              name="send"
              size={18}
              color={text.trim() && !disabled ? '#ffffff' : '#94a3b8'}
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
  },
  containerRTL: {
    alignItems: 'flex-end',
  },
  composer: {
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
      android: {
        elevation: 3,
      },
    }),
  },
  composerRTL: {
    flexDirection: 'row-reverse',
  },
  composerFocused: {
    borderColor: '#4a6fa5',
    backgroundColor: '#ffffff',
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
  sendButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  sendPressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AIChatComposer;