/**
 * User Message Bubble
 * Clean modern user message
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface UserMessageBubbleProps {
  content: string;
  isRTL?: boolean;
}

export function UserMessageBubble({ content, isRTL = false }: UserMessageBubbleProps) {
  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={[styles.bubble, isRTL && styles.bubbleRTL]}>
        <Text style={[styles.content, isRTL && styles.contentRTL]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  containerRTL: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    backgroundColor: '#4a6fa5',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  bubbleRTL: {
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
  },
  contentRTL: {
    textAlign: 'right',
  },
});

export default UserMessageBubble;