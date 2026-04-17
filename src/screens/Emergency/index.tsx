import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Linking,  } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { spacing, radius, shadows } from '../../theme';

const EMERGENCY_SERVICES = [
  { id: '1', name: 'الإسعاف', phone: '997', icon: 'ambulance' as const, color: '#FF453A' },
  { id: '2', name: 'الدفاع المدني', phone: '998', icon: 'fire-truck' as const, color: '#F59E0B' },
  { id: '3', name: 'الشرطة', phone: '999', icon: 'shield-check' as const, color: '#0077C8' },
  { id: '4', name: 'السموم', phone: '920033333', icon: 'bottle-tonic-skull' as const, color: '#A855F7' },
];

const QUICK_TIPS = [
  { id: '1', title: 'ألم في الصدر', desc: 'اتصل بالإسعاف فوراً — لا تتحرك', icon: 'heart-off' as const },
  { id: '2', title: 'صعوبة في التنفس', desc: 'اجلس بشكل مستقيم — افتح النوافذ', icon: 'lungs' as const },
  { id: '3', title: 'إغماء', desc: 'ارفع القدمين — تأكد من التنفس', icon: 'account-alert' as const },
];

export default function EmergencyScreen() {
  const { colors, isDarkMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Screen scrollable>
      <Animated.View style={{ opacity: fadeAnim }}>
        <AppText variant="h2">مركز الطوارئ</AppText>
        <Spacer size="xs" />
        <AppText variant="bodySmall" color={colors.textSecondary}>
          اتصل بخدمات الطوارئ مباشرة
        </AppText>

        <Spacer size="lg" />

        {/* Emergency Services */}
        <View style={styles.servicesGrid}>
          {EMERGENCY_SERVICES.map((service) => (
            <TouchableOpacity
              key={service.id}
              style={[styles.serviceCard, { backgroundColor: service.color + '18' }]}
              onPress={() => handleCall(service.phone)}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIcon, { backgroundColor: service.color + '30' }]}>
                <MaterialCommunityIcons name={service.icon} size={28} color={service.color} />
              </View>
              <AppText variant="label" align="center" style={{ marginTop: spacing.sm }}>
                {service.name}
              </AppText>
              <AppText variant="caption" color={colors.textSecondary} align="center">
                {service.phone}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <Spacer size="xl" />

        {/* Quick Tips */}
        <AppText variant="h3">إسعاف أولي</AppText>
        <Spacer size="md" />

        {QUICK_TIPS.map((tip) => (
          <AppCard key={tip.id} style={styles.tipCard}>
            <View style={styles.tipRow}>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <AppText variant="label">{tip.title}</AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {tip.desc}
                </AppText>
              </View>
              <View style={[styles.tipIcon, { backgroundColor: colors.accentRed + '18' }]}>
                <MaterialCommunityIcons name={tip.icon} size={24} color={colors.accentRed} />
              </View>
            </View>
          </AppCard>
        ))}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  servicesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  serviceCard: {
    width: '47%',
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    minHeight: 130,
    justifyContent: 'center',
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    marginBottom: spacing.sm,
  },
  tipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
