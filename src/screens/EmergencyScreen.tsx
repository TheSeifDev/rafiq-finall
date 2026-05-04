import React, { useCallback, useMemo } from 'react';
import {
  Linking,
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  Platform,
  Share,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { AppCard } from '../components/ui/AppCard';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { useLocale } from '../hooks/useLocale';

const C = {
  bg: '#0A0F1C',
  surface: '#111827',
  card: '#1A2332',
  cardBorder: 'rgba(255,255,255,0.06)',
  text: '#F1F5F9',
  textMuted: '#94A3B8',
  danger: '#FF3B3B',
  dangerLight: '#FF6B6B',
  warning: '#F59E0B',
  info: '#00C2FF',
  success: '#10B981',
  purple: '#A78BFA',
};

type IconType = 'ion' | 'fa';
type TranslationKey = keyof typeof translations.en;

const translations = {
  en: {
    emergencyTitle: 'Emergency',
    emergencySubtitle: 'Quick access to emergency services',
    sos: 'SOS Emergency',
    sosDesc: 'Tap to call Ambulance immediately',
    firstAidTitle: 'First Aid Guide',
    firstAidSubtitle: 'Step-by-step emergency instructions',
    call: 'Call',
    shareLocation: 'Share My Location',
    cpr: 'CPR',
    cprDesc: 'Push hard and fast in the center of the chest.',
    cprStep1: 'Check responsiveness',
    cprStep2: 'Call 997',
    cprStep3: 'Push 100-120/min',
    breathing: 'Breathing',
    breathingDesc: 'Sit upright and loosen tight clothing.',
    breathingStep1: 'Sit upright',
    breathingStep2: 'Loosen clothing',
    breathingStep3: 'Call if severe',
    faint: 'Fainting',
    faintDesc: 'Lay flat and elevate legs.',
    faintStep1: 'Lay on back',
    faintStep2: 'Elevate legs',
    faintStep3: 'Fresh air',
    bleeding: 'Bleeding',
    bleedingDesc: 'Apply firm pressure with clean cloth.',
    bleedingStep1: 'Apply pressure',
    bleedingStep2: 'Use clean cloth',
    bleedingStep3: 'Elevate limb',
    burn: 'Burns',
    burnDesc: 'Cool under running water.',
    burnStep1: 'Cool with water',
    burnStep2: '10-20 minutes',
    burnStep3: 'Cover loosely',
    poison: 'Poison',
    poisonDesc: 'Do not induce vomiting.',
    poisonStep1: 'Do not vomit',
    poisonStep2: 'Call 997',
    poisonStep3: 'Keep container',
    shock: 'Shock',
    shockDesc: 'Keep warm and lying down.',
    shockStep1: 'Keep warm',
    shockStep2: 'Lay flat',
    shockStep3: 'Elevate legs',
    ambulance: 'Ambulance',
    police: 'Police',
    fire: 'Fire Dept',
    health: 'Health Line',
    steps: 'Steps',
  },
  ar: {
    emergencyTitle: 'الطوارئ',
    emergencySubtitle: 'وصول سريع لخدمات الطوارئ',
    sos: 'طوارئ SOS',
    sosDesc: 'اضغط للاتصال بالإسعاف فوراً',
    firstAidTitle: 'دليل الإسعافات',
    firstAidSubtitle: 'تعليمات طوارئ خطوة بخطوة',
    call: 'اتصال',
    shareLocation: 'مشاركة موقعي',
    cpr: 'الإنعاش',
    cprDesc: 'اضغط بقوة وسرعة في منتصف الصدر.',
    cprStep1: 'تأكد من الاستجابة',
    cprStep2: 'اتصل 997',
    cprStep3: 'اضغط 100-120/د',
    breathing: 'التنفس',
    breathingDesc: 'اجلس مستقيماً وفك الملابس.',
    breathingStep1: 'اجلس مستقيماً',
    breathingStep2: 'فك الملابس',
    breathingStep3: 'اتصل إن كان حاداً',
    faint: 'الإغماء',
    faintDesc: 'اضبط مستلقياً وارفع الساقين.',
    faintStep1: 'على الظهر',
    faintStep2: 'ارفع الساقين',
    faintStep3: 'هواء نقي',
    bleeding: 'النزيف',
    bleedingDesc: 'اضغط بقوة بقماش نظيف.',
    bleedingStep1: 'اضغط بقوة',
    bleedingStep2: 'قماش نظيف',
    bleedingStep3: 'ارفع العضو',
    burn: 'الحروق',
    burnDesc: 'برد بالماء الجاري.',
    burnStep1: 'برد بالماء',
    burnStep2: '10-20 دقيقة',
    burnStep3: 'غطّ بشكل فضفاض',
    poison: 'التسمم',
    poisonDesc: 'لا تحاول إحداث القيء.',
    poisonStep1: 'لا قيء',
    poisonStep2: 'اتصل 997',
    poisonStep3: 'احتفظ بالعبوة',
    shock: 'الصدمة',
    shockDesc: 'حافظ على الدفء والاستلقاء.',
    shockStep1: 'حافظ على الدفء',
    shockStep2: 'مستلقي',
    shockStep3: 'ارفع الساقين',
    ambulance: 'إسعاف',
    police: 'شرطة',
    fire: 'دفاع مدني',
    health: 'الاستشارات',
    steps: 'الخطوات',
  },
};

type EmergencyItem = {
  number: string;
  icon: string;
  iconType: IconType;
  color: string;
  bg: string;
  labelKey: TranslationKey;
};

type FirstAidItem = {
  icon: string;
  iconType: IconType;
  color: string;
  bg: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  steps: TranslationKey[];
};

export function EmergencyScreen(): React.JSX.Element {
  const { isRTL } = useLocale();
  const { width } = useWindowDimensions();
  const lang = isRTL ? 'ar' : 'en';
  const t = useCallback((k: TranslationKey) => translations[lang][k], [lang]);

  const handleCall = (num: string) => {
    Vibration.vibrate(Platform.OS === 'ios' ? [0, 40] : 40);
    Linking.openURL(`tel:${num}`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: isRTL
          ? 'أحتاج مساعدة طبية عاجلة! هذا موقعي.'
          : 'I need urgent medical help! This is my location.',
      });
    } catch {}
  };

  const emergencies: EmergencyItem[] = useMemo(
    () => [
      { number: '997', icon: 'medkit', iconType: 'ion', color: C.danger, bg: 'rgba(239,68,68,0.15)', labelKey: 'ambulance' },
      { number: '998', icon: 'shield-checkmark', iconType: 'ion', color: C.warning, bg: 'rgba(245,158,11,0.15)', labelKey: 'police' },
      { number: '999', icon: 'flame', iconType: 'ion', color: C.dangerLight, bg: 'rgba(248,113,113,0.15)', labelKey: 'fire' },
      { number: '920033333', icon: 'call', iconType: 'ion', color: C.info, bg: 'rgba(14,165,233,0.15)', labelKey: 'health' },
    ],
    []
  );

  const firstAids: FirstAidItem[] = useMemo(
    () => [
      { icon: 'heart', iconType: 'ion', color: C.danger, bg: 'rgba(239,68,68,0.12)', titleKey: 'cpr', descKey: 'cprDesc', steps: ['cprStep1', 'cprStep2', 'cprStep3'] },
      { icon: 'lungs', iconType: 'fa', color: C.info, bg: 'rgba(14,165,233,0.12)', titleKey: 'breathing', descKey: 'breathingDesc', steps: ['breathingStep1', 'breathingStep2', 'breathingStep3'] },
      { icon: 'bed', iconType: 'fa', color: C.purple, bg: 'rgba(167,139,250,0.12)', titleKey: 'faint', descKey: 'faintDesc', steps: ['faintStep1', 'faintStep2', 'faintStep3'] },
      { icon: 'water', iconType: 'ion', color: C.danger, bg: 'rgba(239,68,68,0.12)', titleKey: 'bleeding', descKey: 'bleedingDesc', steps: ['bleedingStep1', 'bleedingStep2', 'bleedingStep3'] },
      { icon: 'flame', iconType: 'ion', color: C.warning, bg: 'rgba(245,158,11,0.12)', titleKey: 'burn', descKey: 'burnDesc', steps: ['burnStep1', 'burnStep2', 'burnStep3'] },
      { icon: 'skull', iconType: 'ion', color: C.textMuted, bg: 'rgba(148,163,184,0.12)', titleKey: 'poison', descKey: 'poisonDesc', steps: ['poisonStep1', 'poisonStep2', 'poisonStep3'] },
    ],
    []
  );

  const renderIcon = (icon: string, type: IconType, color: string, size = 20) => {
    if (type === 'fa') return <FontAwesome5 name={icon as any} size={size} color={color} />;
    return <Ionicons name={icon as any} size={size} color={color} />;
  };

  return (
    <Screen style={{ backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={[styles.header, isRTL && styles.rowReverse]}>
          <View style={styles.headerText}>
            <AppText variant="h1" style={[styles.headerTitle, isRTL && styles.textRight]}>
              {t('emergencyTitle')}
            </AppText>
            <AppText style={[styles.headerSubtitle, isRTL && styles.textRight]}>
              {t('emergencySubtitle')}
            </AppText>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="warning" size={24} color={C.danger} />
          </View>
        </View>

        {/* SOS Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleCall('997')}
          style={styles.sosBtn}
        >
          <View style={[styles.sosInner, isRTL && styles.rowReverse]}>
            <View style={styles.sosIconWrap}>
              <Ionicons name="alert-circle" size={36} color="#fff" />
            </View>
            <View style={styles.sosTextWrap}>
              <AppText style={styles.sosTitle}>{t('sos')}</AppText>
              <AppText style={styles.sosDesc}>{t('sosDesc')}</AppText>
            </View>
            <View style={styles.sosArrow}>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color="rgba(255,255,255,0.6)" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Share Location */}
        <TouchableOpacity onPress={handleShare} style={[styles.shareBtn, isRTL && styles.rowReverse]}>
          <Ionicons name="location-sharp" size={16} color={C.info} />
          <AppText style={styles.shareText}>{t('shareLocation')}</AppText>
        </TouchableOpacity>

        {/* Emergency Numbers - 2x2 Grid */}
        <View style={[styles.grid2x2, isRTL && styles.gridRTL]}>
          {emergencies.map((item) => (
            <TouchableOpacity
              key={item.number}
              activeOpacity={0.85}
              onPress={() => handleCall(item.number)}
              style={styles.gridItem}
            >
              <AppCard style={styles.emergencyCard}>
                <View style={[styles.emergencyTop, isRTL && styles.rowReverse]}>
                  <View style={[styles.emergencyIcon, { backgroundColor: item.bg }]}>
                    {renderIcon(item.icon, item.iconType, item.color, 22)}
                  </View>
                  <AppText style={[styles.emergencyNumber, { color: item.color }]}>{item.number}</AppText>
                </View>
                <AppText style={[styles.emergencyLabel, isRTL && styles.textRight]}>{t(item.labelKey)}</AppText>
                <View style={[styles.callPill, { backgroundColor: item.color + '18' }]}>
                  <Ionicons name="call" size={12} color={item.color} />
                  <AppText style={[styles.callPillText, { color: item.color }]}>{t('call')}</AppText>
                </View>
              </AppCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* First Aid Section */}
        <View style={[styles.sectionHeader, isRTL && styles.rowReverse]}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Ionicons name="medical" size={20} color={C.success} />
          </View>
          <View style={styles.sectionHeaderText}>
            <AppText variant="h2" style={[styles.sectionTitle, isRTL && styles.textRight]}>
              {t('firstAidTitle')}
            </AppText>
            <AppText style={[styles.sectionSubtitle, isRTL && styles.textRight]}>
              {t('firstAidSubtitle')}
            </AppText>
          </View>
        </View>

        <View style={styles.firstAidList}>
          {firstAids.map((item) => (
            <AppCard key={item.titleKey} style={styles.firstAidCard}>
              <View style={[styles.firstAidHeader, isRTL && styles.rowReverse]}>
                <View style={[styles.firstAidIcon, { backgroundColor: item.bg }]}>
                  {renderIcon(item.icon, item.iconType, item.color, 18)}
                </View>
                <AppText variant="h2" style={[styles.firstAidTitle, { color: item.color }, isRTL && styles.textRight]}>
                  {t(item.titleKey)}
                </AppText>
              </View>
              
              <AppText style={[styles.firstAidDesc, isRTL && styles.textRight]}>
                {t(item.descKey)}
              </AppText>

              <View style={styles.stepsWrap}>
                <AppText style={[styles.stepsLabel, isRTL && styles.textRight]}>{t('steps')}</AppText>
                <View style={styles.stepsList}>
                  {item.steps.map((stepKey, idx) => (
                    <View key={stepKey} style={[styles.stepRow, isRTL && styles.rowReverse]}>
                      <View style={[styles.stepBadge, { backgroundColor: item.color + '18' }]}>
                        <AppText style={[styles.stepNumber, { color: item.color }]}>{idx + 1}</AppText>
                      </View>
                      <AppText style={[styles.stepText, isRTL && styles.textRight]}>{t(stepKey)}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            </AppCard>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  textRight: { textAlign: 'right' },
  gridRTL: { flexDirection: 'row-reverse' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: C.text,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 3,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* SOS */
  sosBtn: {
    backgroundColor: C.danger,
    borderRadius: 20,
    padding: 18,
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  sosInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sosIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextWrap: { flex: 1 },
  sosTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  sosDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 2,
  },
  sosArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Share */
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: 'rgba(14,165,233,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(14,165,233,0.15)',
  },
  shareText: {
    color: C.info,
    fontSize: 13,
    fontWeight: '700',
  },

  /* 2x2 Grid */
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
    flexGrow: 1,
  },
  emergencyCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    gap: 10,
  },
  emergencyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  emergencyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  callPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  callPillText: {
    fontSize: 13,
    fontWeight: '800',
  },

  /* Section */
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: { flex: 1, gap: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: C.textMuted,
  },

  /* First Aid */
  firstAidList: { gap: 10 },
  firstAidCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    gap: 8,
  },
  firstAidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  firstAidIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstAidTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  firstAidDesc: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 20,
  },

  /* Steps */
  stepsWrap: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  stepsLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  stepsList: { gap: 8 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
  },
});