import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, AppText, AppCard, Spacer, EmptyState } from '../../components/ui';
import { useTheme } from '../../store/ThemeContext';
import { spacing, radius } from '../../theme';
import { Routes } from '../../navigation/routes';
import type { HomeStackScreenProps } from '../../types/navigation';
import { TouchableOpacity } from 'react-native';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: 'critical' | 'reminder' | 'general';
  time: string;
}

// Hardcoded for now — will be replaced with real data later
const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'تنبيه: ارتفاع نبضات القلب',
    body: 'تم رصد معدل نبض قلب مرتفع يتجاوز 120 نبضة/دقيقة. يُرجى الراحة والمتابعة.',
    type: 'critical',
    time: 'منذ 5 دقائق',
  },
  {
    id: '2',
    title: 'تذكير بالدواء',
    body: 'حان موعد تناول دواء الضغط — أسبرين 81 مجم',
    type: 'reminder',
    time: 'منذ 30 دقيقة',
  },
  {
    id: '3',
    title: 'تقرير يومي جاهز',
    body: 'تقريرك اليومي جاهز للمراجعة. اطّلع على ملخص مؤشراتك الحيوية.',
    type: 'general',
    time: 'منذ ساعة',
  },
  {
    id: '4',
    title: 'تنبيه: انخفاض مستوى الأوكسجين',
    body: 'تم رصد مستوى أوكسجين أقل من 94%. يُرجى التحقق والتواصل مع الطبيب.',
    type: 'critical',
    time: 'منذ ساعتين',
  },
];

const TYPE_CONFIG: Record<NotificationItem['type'], { icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string }> = {
  critical: { icon: 'alert-circle', color: '#FF453A' },
  reminder: { icon: 'bell-ring', color: '#F59E0B' },
  general: { icon: 'information', color: '#00C2FF' },
};

function NotifCard({ item }: { item: NotificationItem }) {
  const { colors } = useTheme();
  const config = TYPE_CONFIG[item.type];

  return (
    <AppCard style={styles.notifCard}>
      <View style={styles.notifRow}>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <AppText variant="label">{item.title}</AppText>
          <AppText variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {item.body}
          </AppText>
          <AppText variant="caption" color={colors.textDisabled} style={{ marginTop: spacing.xs }}>
            {item.time}
          </AppText>
        </View>
        <View style={[styles.notifIcon, { backgroundColor: config.color + '18' }]}>
          <MaterialCommunityIcons name={config.icon} size={24} color={config.color} />
        </View>
      </View>
    </AppCard>
  );
}

export default function NotificationsScreen({ navigation }: HomeStackScreenProps<typeof Routes.Notifications>) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <Screen padded={false}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <View style={styles.header}>
          <AppText variant="h2">الإشعارات</AppText>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-right" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={MOCK_NOTIFICATIONS}
          renderItem={({ item }) => <NotifCard item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState icon="bell-off-outline" message="لا توجد إشعارات حالياً" />
          }
        />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  notifCard: {
    marginBottom: spacing.sm,
  },
  notifRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
