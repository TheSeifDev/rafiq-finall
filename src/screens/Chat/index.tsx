import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { spacing, radius } from '../../theme';

export default function ChatScreen() {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <Screen>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.centerContent}>
          <View style={[styles.iconWrapper, { backgroundColor: colors.primary + '18' }]}>
            <MaterialCommunityIcons name="robot-outline" size={64} color={colors.primary} />
          </View>
          <Spacer size="lg" />
          <AppText variant="h2" align="center">
            مساعد رفيق الذكي
          </AppText>
          <Spacer size="sm" />
          <AppText variant="body" color={colors.textSecondary} align="center">
            قريباً — سيكون بإمكانك التحدث مع مساعد رفيق الصحي للحصول على نصائح وإرشادات طبية مخصصة.
          </AppText>
        </View>

        <AppCard style={styles.featureCard}>
          <View style={styles.featureRow}>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <AppText variant="label">استشارات صحية فورية</AppText>
              <AppText variant="caption" color={colors.textSecondary}>
                احصل على إجابات لأسئلتك الصحية
              </AppText>
            </View>
            <MaterialCommunityIcons name="chat-processing-outline" size={32} color={colors.accentGreen} />
          </View>
        </AppCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCard: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
});
