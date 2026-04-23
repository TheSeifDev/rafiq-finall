import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppText } from '../components/ui/AppText';
import { AppButton } from '../components/ui/AppButton';
import { spacing } from '../theme';
import type { AuthStackParamList } from '../navigation/types';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AuthStackParamList, 'PrivacyPolicy'>;

const COLORS = {
  neutral: '#0A0F1C',
  primary: '#00C2FF',
  tertiary: '#FF3B3B',
  white: '#FFFFFF',
};

const SECTIONS = [
  {
    title: '1. البيانات التي نجمعها',
    content: 'نجمع: اسمك، بريدك الإلكتروني، رقم هاتفك، وبيانات صحية تختار مشاركتها.',
  },
  {
    title: '2. كيف نستخدم بياناتك',
    content: 'نستخدمها لتقديم الخدمة وتحسينها. لن نبيع بياناتك لأي طرف ثالث.',
  },
  {
    title: '3. أمان البيانات',
    content: 'نستخدم تشفيراً لتأمين بياناتك، لكن لا يوجد نظام آمن 100%.',
  },
  {
    title: '4. حقوقك',
    content: 'يمكنك الوصول إلى بياناتك، تعديلها، أو حذفها في أي وقت.',
  },
  {
    title: '5. الاحتفاظ بالبيانات',
    content: 'نحتفظ ببياناتك طالما كان حسابك نشطاً. عند الحذف، نحذفها خلال 30 يوماً.',
  },
];

export function PrivacyPolicyScreen({ navigation }: Props): React.JSX.Element {
  return (
    <Screen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.neutral} />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
        </Pressable>
        <AppText style={styles.headerTitle}>سياسة الخصوصية</AppText>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <AppText style={styles.lastUpdated}>آخر تحديث: أبريل 2026</AppText>

        {SECTIONS.map((section, index) => (
          <View key={index} style={styles.section}>
            <AppText style={styles.sectionTitle}>{section.title}</AppText>
            <AppText style={styles.sectionContent}>{section.content}</AppText>
          </View>
        ))}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <AppButton
          title="فهمت و أوافق"
          variant="tertiary"
          onPress={() => navigation.goBack()}
          style={styles.agreeBtn}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  scrollContent: { paddingHorizontal: spacing.lg },
  lastUpdated: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.35)',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: spacing.sm },
  sectionContent: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
    textAlign: 'right',
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
    backgroundColor: COLORS.neutral,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  agreeBtn: { height: 52, borderRadius: 14 },
});