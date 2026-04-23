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

type Props = NativeStackScreenProps<AuthStackParamList, 'TermsOfService'>;

const COLORS = {
  neutral: '#0A0F1C',
  primary: '#00C2FF',
  tertiary: '#FF3B3B',
  white: '#FFFFFF',
};

const SECTIONS = [
  {
    title: '1. مقدمة',
    content: 'مرحباً بك في تطبيق "رفيق". باستخدامك لهذا التطبيق، فإنك توافق على الالتزام الكامل بهذه الشروط والأحكام.',
  },
  {
    title: '2. طبيعة الخدمة',
    content: 'التطبيق يقدم خدمات إرشادية وداعمة في المجال الصحي والنفسي، ولا يُعتبر بديلاً عن الاستشارة الطبية المهنية.',
  },
  {
    title: '3. إخلاء المسؤولية الطبية',
    content: 'لا يقدم التطبيق تشخيصاً طبياً أو وصفاً للأدوية. أي معلومات صحية يتم تبادلها هي على مسؤولية المستخدم الشخصية.',
  },
  {
    title: '4. عدم تحمل المسؤولية',
    content: 'لا نتحمل أي مسؤولية عن أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق.',
  },
  {
    title: '5. مسؤولية المستخدم',
    content: 'المستخدم يتحمل المسؤولية الكاملة عن صحة المعلومات التي يقدمها وحماية بيانات حسابه.',
  },
  {
    title: '6. إنهاء الخدمة',
    content: 'نحتفظ بالحق في تعليق أو إنهاء حساب أي مستخدم ينتهك هذه الشروط.',
  },
  {
    title: '7. القانون الواجب التطبيق',
    content: 'تخضع هذه الشروط لقوانين جمهورية مصر العربية.',
  },
];

export function TermsOfServiceScreen({ navigation }: Props): React.JSX.Element {
  return (
    <Screen style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.neutral} />

      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={COLORS.white} />
        </Pressable>
        <AppText style={styles.headerTitle}>شروط الاستخدام</AppText>
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