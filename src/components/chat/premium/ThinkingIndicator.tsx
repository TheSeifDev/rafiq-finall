/**
 * Thinking Indicator
 * Modern animated thinking state
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ThinkingIndicatorProps {
  isRTL?: boolean;
  label?: string;
}

export function ThinkingIndicator({
  isRTL = false,
  label,
}: ThinkingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0.4)).current;
  const dot2 = useRef(new Animated.Value(0.4)).current;
  const dot3 = useRef(new Animated.Value(0.4)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    };

    animateDot(dot1, 0).start();
    animateDot(dot2, 150).start();
    animateDot(dot3, 300).start();

    // Subtle glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Avatar with glow */}
      <Animated.View style={[styles.avatar, { opacity: glowAnim }]} />
      <View style={styles.avatarInner}>
        <Text style={styles.avatarIcon}>🏥</Text>
      </View>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>

      {/* Label */}
      <Text style={[styles.label, isRTL && styles.labelRTL]}>
        {label || (isRTL ? 'RAFIQ يكتب...' : 'RAFIQ is writing...')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4a6fa5',
  },
  avatarInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarIcon: {
    fontSize: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginRight: 8,
    marginLeft: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4a6fa5',
    marginHorizontal: 2,
  },
  label: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  labelRTL: {
    textAlign: 'right',
  },
});

export default ThinkingIndicator;