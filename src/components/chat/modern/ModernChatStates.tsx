/**
 * Modern Chat States
 * Empty state, loading skeleton, and error display
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ═══════════════════════════════════════════════════════════════════════════
// Empty State
// ═══════════════════════════════════════════════════════════════════════════

interface ChatEmptyStateProps {
  isRTL?: boolean;
}

export function ChatEmptyState({ isRTL = false }: ChatEmptyStateProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    ).start();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      <Animated.View
        style={[
          styles.emptyIconContainer,
          { transform: [{ translateY: floatAnim }] },
        ]}
      >
        <View style={styles.emptyIcon}>
          <Ionicons name="heart" size={40} color="#4a6fa5" />
        </View>
      </Animated.View>

      <Text style={[styles.emptyTitle, isRTL && styles.textRTL]}>
        {isRTL ? 'مساعدك الصحي الذكي' : 'Your Smart Health Assistant'}
      </Text>

      <Text style={[styles.emptySubtitle, isRTL && styles.textRTL]}>
        {isRTL
          ? 'اسألني عن صحتك، أدويتك، أو أي سؤال طبي'
          : 'Ask me about your health, medications, or any medical question'}
      </Text>

      <View style={[styles.featureList, isRTL && styles.featureListRTL]}>
        <View style={styles.featureItem}>
          <Ionicons name="pulse" size={20} color="#4a6fa5" />
          <Text style={[styles.featureText, isRTL && styles.textRTL]}>
            {isRTL ? 'فهم قراءاتك الصحية' : 'Understand your vitals'}
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="medical" size={20} color="#4a6fa5" />
          <Text style={[styles.featureText, isRTL && styles.textRTL]}>
            {isRTL ? 'تذكير بالأدوية' : 'Medication reminders'}
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="chatbubble" size={20} color="#4a6fa5" />
          <Text style={[styles.featureText, isRTL && styles.textRTL]}>
            {isRTL ? 'نصائح صحية مخصصة' : 'Personalized health tips'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Loading State
// ═══════════════════════════════════════════════════════════════════════════

interface LoadingStateProps {
  isRTL?: boolean;
}

export function LoadingState({ isRTL = false }: LoadingStateProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    animate(dot1, 0).start();
    animate(dot2, 150).start();
    animate(dot3, 300).start();
  }, []);

  return (
    <View style={[styles.loadingContainer, isRTL && styles.loadingContainerRTL]}>
      <View style={styles.loadingDots}>
        <Animated.View
          style={[
            styles.loadingDot,
            { opacity: dot1 },
          ]}
        />
        <Animated.View
          style={[
            styles.loadingDot,
            { opacity: dot2 },
          ]}
        />
        <Animated.View
          style={[
            styles.loadingDot,
            { opacity: dot3 },
          ]}
        />
      </View>
      <Text style={[styles.loadingText, isRTL && styles.textRTL]}>
        {isRTL ? 'RAFIQ يفكر...' : 'RAFIQ is thinking...'}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Error State
// ═══════════════════════════════════════════════════════════════════════════

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  isRTL?: boolean;
}

export function ErrorState({ message, onRetry, isRTL = false }: ErrorStateProps) {
  return (
    <View style={[styles.errorContainer, isRTL && styles.errorContainerRTL]}>
      <View style={styles.errorIcon}>
        <Ionicons name="warning" size={24} color="#ef4444" />
      </View>
      <Text style={[styles.errorText, isRTL && styles.textRTL]}>{message}</Text>
      {onRetry && (
        <Text
          style={styles.retryText}
          onPress={onRetry}
        >
          {isRTL ? 'إعادة المحاولة' : 'Tap to retry'}
        </Text>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Provider Badge
// ═══════════════════════════════════════════════════════════════════════════

interface ProviderBadgeProps {
  provider: string;
  isRTL?: boolean;
}

export function ProviderBadge({ provider, isRTL = false }: ProviderBadgeProps) {
  const getProviderIcon = (p: string) => {
    const lower = p.toLowerCase();
    if (lower.includes('openrouter') || lower.includes('gpt')) return 'globe';
    if (lower.includes('groq')) return 'flash';
    if (lower.includes('fallback')) return 'help-circle';
    return 'sparkles';
  };

  return (
    <View style={[styles.badge, isRTL && styles.badgeRTL]}>
      <Ionicons
        name={getProviderIcon(provider) as any}
        size={12}
        color="#4a6fa5"
        style={isRTL ? { marginLeft: 4, marginRight: 0 } : { marginRight: 4 }}
      />
      <Text style={[styles.badgeText, isRTL && styles.textRTL]}>{provider}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  featureList: {
    gap: 12,
    alignItems: 'center',
  },
  featureListRTL: {
    alignItems: 'flex-end',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#475569',
  },

  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadingContainerRTL: {
    flexDirection: 'row-reverse',
  },
  loadingDots: {
    flexDirection: 'row',
    marginRight: 8,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4a6fa5',
    marginHorizontal: 2,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },

  // Error state
  errorContainer: {
    alignItems: 'center',
    padding: 16,
  },
  errorContainerRTL: {
    alignItems: 'flex-end',
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  retryText: {
    fontSize: 13,
    color: '#4a6fa5',
    fontWeight: '500',
  },

  // Provider badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  badgeRTL: {
    flexDirection: 'row-reverse',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4a6fa5',
  },

  // Common
  textRTL: {
    textAlign: 'right',
  },
});

export default {
  ChatEmptyState,
  LoadingState,
  ErrorState,
  ProviderBadge,
};