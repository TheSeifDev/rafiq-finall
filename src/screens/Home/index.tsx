import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import { patientService } from '../../services/patient.service';
import { vitalsService } from '../../services/vitals.service';
import { spacing, radius, shadows } from '../../theme';
import { Routes } from '../../navigation/routes';
import type { HomeStackScreenProps } from '../../types/navigation';

// --------- Grid Button ---------
interface GridBtnProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function GridBtn({ icon, label, color, bgColor, onPress }: GridBtnProps) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.gridBtn, { backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons name={icon} size={28} color={color} />
      <AppText variant="caption" color={colors.text} align="center" style={styles.gridLabel}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

// --------- Home Screen ---------
export default function HomeScreen({ navigation }: HomeStackScreenProps<typeof Routes.Home>) {
  const { colors, isDarkMode } = useTheme();
  const { user } = useAuth();

  const [userName, setUserName] = useState('مستخدم رفيق');
  const [heartRate, setHeartRate] = useState(0);
  const [hasNewNotif, setHasNewNotif] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const [name, bpm] = await Promise.all([
          patientService.getUserName(user.id),
          vitalsService.getLastHeartRate(user.id),
        ]);
        setUserName(name);
        setHeartRate(bpm);
      } catch {
        // Silently fail — defaults shown
      }
    };

    loadData();

    const channel = vitalsService.subscribeToNotifications(() => setHasNewNotif(true));
    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const gridItems: GridBtnProps[] = [
    { icon: 'pill', label: 'الأدوية', color: '#A855F7', bgColor: isDarkMode ? '#2D1B4E' : '#F3E8FF', onPress: () => navigation.navigate(Routes.Medication) },
    { icon: 'hospital-box-outline', label: 'الطوارئ', color: '#FF453A', bgColor: isDarkMode ? '#3D1B1B' : '#FEE2E2', onPress: () => navigation.getParent()?.navigate(Routes.EmergencyTab) },
    { icon: 'heart-pulse', label: 'المؤشرات', color: '#00C2FF', bgColor: isDarkMode ? '#0F2A3D' : '#E0F7FF', onPress: () => navigation.getParent()?.navigate(Routes.VitalsTab) },
    { icon: 'chat-outline', label: 'المحادثة', color: '#10B981', bgColor: isDarkMode ? '#0D2D22' : '#D1FAE5', onPress: () => navigation.getParent()?.navigate(Routes.ChatTab) },
  ];

  return (
    <Screen scrollable>
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate(Routes.Notifications)}
            style={styles.notifButton}
          >
            <MaterialCommunityIcons
              name={hasNewNotif ? 'bell-badge' : 'bell-outline'}
              size={26}
              color={hasNewNotif ? colors.accentRed : colors.textSecondary}
            />
          </TouchableOpacity>
          <View>
            <AppText variant="bodySmall" color={colors.textSecondary}>
              مرحباً 👋
            </AppText>
            <AppText variant="h2">{userName}</AppText>
          </View>
        </View>

        <Spacer size="lg" />

        {/* Vital Card */}
        <AppCard style={[styles.vitalCard, { backgroundColor: isDarkMode ? colors.surface : '#191D32' }]}>
          <View style={styles.vitalRow}>
            <MaterialCommunityIcons name="heart-pulse" size={40} color="#FF453A" />
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <AppText variant="caption" color="rgba(255,255,255,0.6)" align="right">
                نبضات القلب
              </AppText>
              <AppText variant="h1" color="#FFFFFF" align="right">
                {heartRate > 0 ? `${heartRate}` : '--'}{' '}
                <AppText variant="caption" color="rgba(255,255,255,0.5)">bpm</AppText>
              </AppText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: heartRate > 100 ? '#FF453A33' : '#4ADE8033' }]}>
            <AppText variant="caption" color={heartRate > 100 ? '#FF453A' : '#4ADE80'} align="center">
              {heartRate > 100 ? 'مرتفع — يُرجى الراحة' : heartRate > 0 ? 'ضمن المعدل الطبيعي' : 'لا تتوفر بيانات'}
            </AppText>
          </View>
        </AppCard>

        <Spacer size="lg" />

        {/* Quick Actions */}
        <AppText variant="h3">خدمات سريعة</AppText>
        <Spacer size="md" />
        <View style={styles.gridContainer}>
          {gridItems.map((item) => (
            <GridBtn key={item.label} {...item} />
          ))}
        </View>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  notifButton: {
    padding: spacing.sm,
  },
  vitalCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  vitalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  statusBadge: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  gridBtn: {
    width: '47%',
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  gridLabel: {
    marginTop: spacing.sm,
    fontWeight: '600',
  },
});
