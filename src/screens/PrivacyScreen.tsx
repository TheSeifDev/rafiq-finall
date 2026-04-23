import React, { useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { AppText } from '../components/ui/AppText';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { translations } from '../constants/translations';
import type { ProfileStackScreenProps } from '../navigation/types';

type Props = ProfileStackScreenProps<'Privacy'>;

function InfoRow({
  icon,
  iconColor,
  title,
  description,
  rightContent,
  isLast,
  darkMode,
  colors,
}: {
  icon: string;
  iconColor: string;
  title: string;
  description?: string;
  rightContent?: React.ReactNode;
  isLast?: boolean;
  darkMode: boolean;
  colors: any;
}) {
  const dividerColor = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  return (
    <View style={[styles.infoRow, !isLast && { borderBottomWidth: 1, borderBottomColor: dividerColor }]}>
      <View style={[styles.infoIconWrap, { backgroundColor: iconColor + '12' }]}>
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <View style={styles.infoContent}>
        <AppText style={[styles.infoTitle, { color: colors.textPrimary }]}>{title}</AppText>
        {description && (
          <AppText style={[styles.infoDesc, { color: colors.textSecondary }]}>{description}</AppText>
        )}
      </View>
      {rightContent && <View style={styles.infoRight}>{rightContent}</View>}
    </View>
  );
}

export function PrivacyScreen({ navigation }: Props): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language] as any;

  const [locationEnabled, setLocationEnabled] = useState(false);
  const [healthEnabled, setHealthEnabled] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(true);

  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.80)' : 'rgba(255, 255, 255, 0.92)';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const makeSwitch = (val: boolean, onChange: (v: boolean) => void) => (
    <Switch
      value={val}
      onValueChange={onChange}
      trackColor={{ false: '#D1D5DB', true: colors.primary + '50' }}
      thumbColor={val ? colors.primary : '#F3F4F6'}
    />
  );

  return (
    <Screen>
      <ScreenHeader title={t.privacyLabel} onBack={() => navigation.goBack()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Data Usage ── */}
        <View style={styles.sectionWrap}>
          <AppText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t.dataUsage}
          </AppText>
          <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <View style={styles.dataUsageContent}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.success} />
              <AppText style={[styles.dataUsageText, { color: colors.textPrimary }]}>
                {t.dataUsageDesc}
              </AppText>
            </View>
          </View>
        </View>

        {/* ── Permissions ── */}
        <View style={styles.sectionWrap}>
          <AppText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t.permissions}
          </AppText>
          <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <InfoRow
              icon="location-outline"
              iconColor="#0EA5E9"
              title={t.locationPerm}
              darkMode={darkMode}
              colors={colors}
              rightContent={makeSwitch(locationEnabled, setLocationEnabled)}
            />
            <InfoRow
              icon="heart-outline"
              iconColor="#EF4444"
              title={t.healthPerm}
              darkMode={darkMode}
              colors={colors}
              rightContent={makeSwitch(healthEnabled, setHealthEnabled)}
            />
            <InfoRow
              icon="notifications-outline"
              iconColor="#F59E0B"
              title={t.notifPerm}
              darkMode={darkMode}
              colors={colors}
              isLast
              rightContent={makeSwitch(notifEnabled, setNotifEnabled)}
            />
          </View>
        </View>

        {/* ── Data Actions ── */}
        <View style={styles.sectionWrap}>
          <AppText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {t.healthData}
          </AppText>
          <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <TouchableOpacity activeOpacity={0.6} style={styles.actionRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <AppText style={[styles.infoTitle, { color: colors.textPrimary }]}>{t.exportData}</AppText>
                <AppText style={[styles.infoDesc, { color: colors.textSecondary }]}>{t.exportDataDesc}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary + '60'} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.6} style={[styles.actionRow, { borderTopWidth: 1, borderTopColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={[styles.infoIconWrap, { backgroundColor: colors.danger + '12' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <View style={styles.infoContent}>
                <AppText style={[styles.infoTitle, { color: colors.danger }]}>{t.deleteAccount}</AppText>
                <AppText style={[styles.infoDesc, { color: colors.textSecondary }]}>{t.deleteAccountConfirm}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary + '60'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Legal ── */}
        <View style={styles.sectionWrap}>
          <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: cardBorder }]}>
            <TouchableOpacity activeOpacity={0.6} style={styles.legalRow}>
              <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
              <AppText style={[styles.legalText, { color: colors.textPrimary }]}>{t.termsOfService}</AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary + '60'} />
            </TouchableOpacity>
            <View style={{ height: 1, backgroundColor: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
            <TouchableOpacity activeOpacity={0.6} style={styles.legalRow}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              <AppText style={[styles.legalText, { color: colors.textPrimary }]}>{t.privacyPolicy}</AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary + '60'} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: spacing['2xl'] }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionWrap: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // ── Data usage ──
  dataUsageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  dataUsageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  // ── Info rows ──
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  infoRight: {
    marginLeft: spacing.sm,
  },
  // ── Actions ──
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  // ── Legal ──
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  legalText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
