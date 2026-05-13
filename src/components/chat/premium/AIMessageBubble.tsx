/**
 * AI Message Bubble
 * Premium healthcare AI response with streaming and markdown
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AIMessageBubbleProps {
  content: string;
  isStreaming?: boolean;
  isThinking?: boolean;
  isRTL?: boolean;
}

export function AIMessageBubble({
  content,
  isStreaming = false,
  isThinking = false,
  isRTL = false,
}: AIMessageBubbleProps) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (isThinking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0.6);
    }
  }, [isThinking]);

  const hasContent = content && content.length > 0;

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarIcon}>🏥</Text>
      </View>

      {/* Content */}
      <View style={[styles.bubble, isRTL && styles.bubbleRTL]}>
        {isThinking && !hasContent && (
          <View style={styles.thinkingContainer}>
            <View style={styles.thinkingDots}>
              <Animated.View
                style={[styles.dot, { opacity: pulseAnim }]}
              />
              <Animated.View
                style={[styles.dot, { opacity: pulseAnim }]}
              />
              <Animated.View
                style={[styles.dot, { opacity: pulseAnim }]}
              />
            </View>
            <Text style={[styles.thinkingText, isRTL && styles.textRTL]}>
              {isRTL ? 'RAFIQ يكتب...' : 'RAFIQ is writing...'}
            </Text>
          </View>
        )}

        {hasContent && (
          <View style={styles.contentWrapper}>
            <MarkdownRenderer content={content} isRTL={isRTL} />

            {/* Streaming cursor */}
            {isStreaming && (
              <View style={styles.cursorContainer}>
                <View style={styles.cursor} />
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 4,
  },
  avatarRTL: {
    marginRight: 0,
    marginLeft: 10,
  },
  avatarIcon: {
    fontSize: 18,
  },
  bubble: {
    flex: 1,
    maxWidth: '82%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleRTL: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 4,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thinkingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4a6fa5',
    marginHorizontal: 2,
  },
  thinkingText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  textRTL: {
    textAlign: 'right',
  },
  contentWrapper: {
    minHeight: 20,
  },
  cursorContainer: {
    marginTop: 4,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: '#4a6fa5',
    borderRadius: 1,
  },
});

export default AIMessageBubble;