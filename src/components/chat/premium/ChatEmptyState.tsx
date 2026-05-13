/**
 * Chat Empty State
 * Modern empty state for AI chat
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatEmptyStateProps {
  isRTL?: boolean;
  onSelectSuggestion?: (msg: string) => void;
}

export function ChatEmptyState({ isRTL = false, onSelectSuggestion }: ChatEmptyStateProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 10,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const suggestions = isRTL
    ? [
        'تذكير بالأدوية',
        'نبض القلب',
        'قياس الحرارة',
        'وجبات صحية',
      ]
    : [
        'Med reminder',
        'Heart rate',
        'Check fever',
        'Healthy meals',
      ];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Icon */}
      <Animated.View
        style={[styles.iconContainer, { transform: [{ translateY: floatAnim }] }]}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="heart" size={36} color="#4a6fa5" />
        </View>
      </Animated.View>

      {/* Title */}
      <Text style={[styles.title, isRTL && styles.titleRTL]}>
        {isRTL ? 'مساعدك الصحي الذكي' : 'Your Smart Health Assistant'}
      </Text>

      {/* Subtitle */}
      <Text style={[styles.subtitle, isRTL && styles.subtitleRTL]}>
        {isRTL
          ? 'اسألني عن صحتك، أدويتك، أو نصائح صحية'
          : 'Ask me about your health, medications, or health tips'}
      </Text>

      {/* Quick suggestions */}
      <View style={[styles.suggestions, isRTL && styles.suggestionsRTL]}>
        {suggestions.map((item, index) => (
          <View key={index} style={styles.suggestionItem}>
            <Text
              style={[styles.suggestionText, isRTL && styles.suggestionTextRTL]}
              onPress={() => onSelectSuggestion?.(item)}
            >
              {item}
            </Text>
          </View>
        ))}
      </View>

      {/* Features */}
      <View style={styles.features}>
        <View style={styles.feature}>
          <Ionicons name="pulse" size={18} color="#4a6fa5" />
          <Text style={[styles.featureText, isRTL && styles.featureTextRTL]}>
            {isRTL ? 'فهم قراءاتك' : 'Understand your vitals'}
          </Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="medical" size={18} color="#4a6fa5" />
          <Text style={[styles.featureText, isRTL && styles.featureTextRTL]}>
            {isRTL ? 'تذكير بالأدوية' : 'Medication reminders'}
          </Text>
        </View>
        <View style={styles.feature}>
          <Ionicons name="chatbubble" size={18} color="#4a6fa5" />
          <Text style={[styles.featureText, isRTL && styles.featureTextRTL]}>
            {isRTL ? 'نصائح مخصصة' : 'Personalized tips'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleRTL: {
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  subtitleRTL: {
    textAlign: 'center',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  suggestionsRTL: {
    flexDirection: 'row-reverse',
  },
  suggestionItem: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionText: {
    fontSize: 13,
    color: '#4a6fa5',
    fontWeight: '500',
  },
  suggestionTextRTL: {
    textAlign: 'right',
  },
  features: {
    gap: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#475569',
  },
  featureTextRTL: {
    textAlign: 'right',
  },
});

export default ChatEmptyState;