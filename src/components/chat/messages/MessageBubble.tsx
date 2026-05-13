/**
 * Message Bubble Component
 * Clean, modern message bubbles without glassmorphism
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  content: React.ReactNode;
  isUser: boolean;
  isRTL?: boolean;
  isStreaming?: boolean;
}

export function MessageBubble({ content, isUser, isRTL = false, isStreaming = false }: MessageBubbleProps) {
  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userBubble : styles.assistantBubble,
        isRTL && (isUser ? styles.userBubbleRTL : styles.assistantBubbleRTL),
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubbleInner : styles.assistantBubbleInner,
        ]}
      >
        <Text
          style={[
            styles.content,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {content}
        </Text>
        {isStreaming && (
          <View style={styles.typingIndicator}>
            <View style={[styles.dot, styles.dotFirst]} />
            <View style={[styles.dot, styles.dotMiddle]} />
            <View style={[styles.dot, styles.dotLast]} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
  },
  userBubbleRTL: {
    alignSelf: 'flex-start',
  },
  assistantBubbleRTL: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  userBubbleInner: {
    backgroundColor: '#4a6fa5',
    borderBottomRightRadius: 4,
  },
  assistantBubbleInner: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#ffffff',
  },
  assistantText: {
    color: '#1a1a2e',
  },
  typingIndicator: {
    flexDirection: 'row',
    marginTop: 8,
    height: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4a6fa5',
    marginHorizontal: 2,
  },
  dotFirst: {
    opacity: 0.4,
  },
  dotMiddle: {
    opacity: 0.6,
  },
  dotLast: {
    opacity: 0.8,
  },
});

export default MessageBubble;