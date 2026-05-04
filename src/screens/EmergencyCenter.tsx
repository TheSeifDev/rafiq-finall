import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { spacing } from '../theme';

interface EmergencyAction {
  id: string;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  statusAr: string;
  statusEn: string;
  statusTone: 'success' | 'warning' | 'primary';
  icon: string;
  actionType: 'call' | 'navigate' | 'info';
  actionValue?: string;
}

const EMERGENCY_ACTIONS: EmergencyAction[] = [
  {
    id: '1',
    titleAr: 'الاتصال المباشر بالإسعاف',
    titleEn: 'Call Emergency Services',
    subtitleAr: 'رقم الطوارئ الموحد لتقديم البلاغات العاجلة',
    subtitleEn: 'Unified emergency number for urgent reports',
    statusAr: 'متوفر الآن',
    statusEn: 'Available Now',
    statusTone: 'success',
    icon: 'call-outline',
    actionType: 'call',
    actionValue: 'tel:997',
  },
  {
    id: '2',
    titleAr: 'أقرب المستشفيات المعتمدة',
    titleEn: 'Nearest Certified Hospitals',
    subtitleAr: '• مستشفى الملك فهد (5 كم)\n• مستشفى التخصصي (3 كم)',
    subtitleEn: '• King Fahad Hospital (5 km)\n• Specialist Hospital (3 km)',
    statusAr: 'مفتوح 24/7',
    statusEn: 'Open 24/7',
    statusTone: 'success',
    icon: 'location-outline',
    actionType: 'navigate',
  },
  {
    id: '3',
    titleAr: 'دليل الإسعافات الأولية',
    titleEn: 'First Aid Guide',
    subtitleAr: 'تعامل بذكاء مع حالات الاختناق، النزيف، والحروق',
    subtitleEn: 'Handle choking, bleeding, and burns smartly',
    statusAr: 'دليل تفاعلي',
    statusEn: 'Interactive Guide',
    statusTone: 'primary',
    icon: 'medkit-outline',
    actionType: 'info',
  },
  {
    id: '4',
    titleAr: 'استشارة طبية مرئية',
    titleEn: 'Video Medical Consultation',
    subtitleAr: 'تحدث مع طبيب طوارئ عبر الفيديو مباشرة',
    subtitleEn: 'Talk to an emergency doctor via live video',
    statusAr: 'متاح (انتظار 2 د)',
    statusEn: 'Available (2 min wait)',
    statusTone: 'warning',
    icon: 'videocam-outline',
    actionType: 'info',
  },
];

export default function EmergencyCenter() {
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const isAr = language === 'ar';

  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.80)' : 'rgba(255, 255, 255, 0.92)';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const toneColors: Record<string, string> = {
    success: colors.success,
    warning: colors.warning,
    primary: colors.primary,
    danger: colors.danger,
  };

  const handleAction = (action: EmergencyAction) => {
    if (action.actionType === 'call' && action.actionValue) {
      Linking.openURL(action.actionValue);
    }
  };

  return (
    <Screen>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: cardBorder }]}>
        <View style={[styles.headerIcon, { backgroundColor: colors.danger + '15' }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.danger} />
        </View>
        <AppText style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isAr ? 'مركز الطوارئ' : 'Emergency Center'}
        </AppText>
        <AppText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {isAr ? 'استجابة فورية للخدمات الطبية العاجلة' : 'Instant response for urgent medical services'}
        </AppText>
      </View>

      {/* ── Emergency Actions ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Call Banner */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL('tel:997')}
          style={[styles.callBanner, { backgroundColor: colors.danger }]}
        >
          <View style={styles.callBannerContent}>
            <View style={styles.callBannerLeft}>
              <View style={[styles.callIcon, { backgroundColor: 'rgba(255,255,255,0.20)' }]}>
                <Ionicons name="call" size={22} color="#fff" />
              </View>
              <View style={styles.callTextWrap}>
                <AppText style={styles.callTitle}>
                  {isAr ? 'اتصال طوارئ سريع' : 'Quick Emergency Call'}
                </AppText>
                <AppText style={styles.callSubtitle}>997</AppText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </View>
        </TouchableOpacity>

        {/* Action Cards */}
        {EMERGENCY_ACTIONS.filter((a) => a.id !== '1').map((action) => {
          const statusColor = toneColors[action.statusTone] ?? colors.primary;

          return (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.7}
              onPress={() => handleAction(action)}
              style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}
            >
              {/* Status */}
              <View style={styles.cardStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <AppText style={[styles.statusText, { color: statusColor }]}>
                  {isAr ? action.statusAr : action.statusEn}
                </AppText>
              </View>

              {/* Body */}
              <View style={styles.cardBody}>
                <View style={[styles.cardIconWrap, { backgroundColor: statusColor + '12' }]}>
                  <Ionicons name={action.icon as any} size={24} color={statusColor} />
                </View>
                <View style={styles.cardTextWrap}>
                  <AppText style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {isAr ? action.titleAr : action.titleEn}
                  </AppText>
                  <AppText style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {isAr ? action.subtitleAr : action.subtitleEn}
                  </AppText>
                </View>
              </View>

              {/* Action hint */}
              <View style={[styles.cardAction, { backgroundColor: statusColor + '10', borderColor: statusColor + '20' }]}>
                <AppText style={[styles.cardActionText, { color: statusColor }]}>
                  {action.actionType === 'call'
                    ? (isAr ? 'اتصال سريع' : 'Quick Call')
                    : action.actionType === 'navigate'
                      ? (isAr ? 'فتح الخريطة' : 'Open Map')
                      : (isAr ? 'عرض التفاصيل' : 'View Details')}
                </AppText>
                <Ionicons name="chevron-forward" size={14} color={statusColor} />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /* ── Header ── */
  header: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    gap: 6,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  /* ── Scroll ── */
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  /* ── Quick Call Banner ── */
  callBanner: {
    borderRadius: 18,
    padding: spacing.lg,
  },
  callBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  callIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTextWrap: {
    gap: 2,
  },
  callTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  callSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* ── Action Card ── */
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});