import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { spacing } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useAppStore } from '../store/app.store';
import { translations } from '../constants/translations';
import type { AuthStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'PrivacyPolicy'>;

const PP_KEYS = [
  { title: 'pp_1_title', body: 'pp_1_body' },
  { title: 'pp_2_title', body: 'pp_2_body' },
  { title: 'pp_3_title', body: 'pp_3_body' },
  { title: 'pp_4_title', body: 'pp_4_body' },
  { title: 'pp_5_title', body: 'pp_5_body' },
] as const;

export function PrivacyPolicyScreen({ navigation }: Props): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  const mutedText = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';
  const bodyText = darkMode ? 'rgba(255,255,255,0.70)' : 'rgba(0,0,0,0.65)';
  const borderColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </Pressable>
        <AppText style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t.privacyPolicy}
        </AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText style={[styles.lastUpdated, { color: mutedText }]}>
          {t.lastUpdated}
        </AppText>

        {PP_KEYS.map((key, index) => (
          <View key={index} style={styles.section}>
            <AppText style={[styles.sectionTitle, { color: colors.secondary }]}>
              {t[key.title]}
            </AppText>
            <AppText
              style={[
                styles.sectionContent,
                { color: bodyText, textAlign: language === 'ar' ? 'right' : 'left' },
              ]}
            >
              {t[key.body]}
            </AppText>
          </View>
        ))}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderTopColor: borderColor }]}>
        <AppButton
          title={t.understood}
          variant="tertiary"
          onPress={() => navigation.goBack()}
          style={styles.agreeBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: spacing.lg },
  lastUpdated: {
    fontSize: 12,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  sectionContent: {
    fontSize: 14,
    lineHeight: 24,
  },
  bottomSpace: { height: 100 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  agreeBtn: { height: 52, borderRadius: 14 },
});