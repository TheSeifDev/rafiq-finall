import React from 'react';
import { 
  StyleSheet, Text, View, ScrollView, 
  TouchableOpacity, SafeAreaView, StatusBar, 
  Linking, Platform 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface EmergencyItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  statusColor: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  btnText: string;
  btnColor: string;
  action?: () => void;
}

interface EmergencyCenterProps {
  onNavigate: (screen: any) => void;
}

const emergencyData: EmergencyItem[] = [
  {
    id: '1',
    title: 'الاتصال المباشر بالإسعاف',
    subtitle: 'رقم الطوارئ الموحد لتقديم البلاغات العاجلة',
    status: 'متوفر الآن',
    statusColor: '#4ade80',
    icon: 'phone-plus',
    btnText: 'اتصال سريع',
    btnColor: '#ef4444',
    action: () => Linking.openURL('tel:997'),
  },
  {
    id: '2',
    title: 'أقرب المستشفيات المعتمدة',
    subtitle: '• مستشفى الملك فهد (5 كم)\n• مستشفى التخصصي (3 كم)',
    status: 'مفتوح 24/7',
    statusColor: '#4ade80',
    icon: 'hospital-marker',
    btnText: 'فتح الخريطة',
    btnColor: '#334155',
  },
  {
    id: '3',
    title: 'دليل الإسعافات الأولية',
    subtitle: 'تعامل بذكاء مع حالات الاختناق، النزيف، والحروق',
    status: 'دليل تفاعلي',
    statusColor: '#3b82f6',
    icon: 'medical-bag',
    btnText: 'عرض الدليل',
    btnColor: '#334155',
  },
  {
    id: '5',
    title: 'استشارة طبية مرئية',
    subtitle: 'تحدث مع طبيب طوارئ عبر الفيديو مباشرة',
    status: 'متاح (انتظار 2 د)',
    statusColor: '#f97316',
    icon: 'video-plus',
    btnText: 'بدء الجلسة',
    btnColor: '#334155',
  },
];

export default function EmergencyCenter({ onNavigate }: EmergencyCenterProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => onNavigate('home')} 
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="chevron-left" size={32} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مركز الطوارئ</Text>
        <Text style={styles.headerSubtitle}>استجابة فورية للخدمات الطبية العاجلة</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {emergencyData.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            activeOpacity={0.9} 
            style={styles.card}
            onPress={item.action}
          >
            <View style={styles.statusContainer}>
              <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
              <View style={[styles.dot, { backgroundColor: item.statusColor }]} />
            </View>

            <View style={styles.cardBody}>
              <View style={styles.textContainer}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                
                <View style={[styles.button, { backgroundColor: item.btnColor }]}>
                  <Text style={styles.buttonText}>{item.btnText}</Text>
                </View>
              </View>

              <View style={styles.iconContainer}>
                 <View style={styles.iconCircle}>
                    <MaterialCommunityIcons name={item.icon} size={35} color="#f87171" />
                 </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: Platform.OS === 'ios' ? 25 : 10 }]}>
        <NavItem icon="account-circle-outline" label="الملف" active={false} onPress={() => onNavigate('profile')} />
        <NavItem icon="pill" label="الأدوية" active={false} onPress={() => onNavigate('clinic')} />
        <NavItem icon="heart-pulse" label="الحيوية" active={false} onPress={() => onNavigate('vitals')} />
        <NavItem icon="home-variant" label="الرئيسية" active={false} onPress={() => onNavigate('home')} />
      </View>
    </SafeAreaView>
  );
}

interface NavItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}

const NavItem = ({ icon, label, active, onPress }: NavItemProps) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <MaterialCommunityIcons name={icon} size={26} color={active ? '#00C2FF' : '#64748B'} />
    <Text style={[styles.navLabel, { color: active ? '#00C2FF' : '#64748B' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { 
    paddingVertical: 20, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#1E2330',
    position: 'relative'
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 22,
    zIndex: 10
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  scrollContent: { padding: 20, paddingBottom: 120 },
  card: { 
    backgroundColor: '#161B26', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#1E2330',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  statusContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  statusText: { fontSize: 12, fontWeight: '700', marginRight: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  textContainer: { flex: 1, alignItems: 'flex-end', paddingRight: 15 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'right' },
  cardSubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'right', marginVertical: 8, lineHeight: 18 },
  iconContainer: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { 
    width: 65, height: 65, borderRadius: 20, 
    backgroundColor: 'rgba(248, 113, 113, 0.1)', 
    alignItems: 'center', justifyContent: 'center' 
  },
  button: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 12, marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  bottomNav: { 
    position: 'absolute', bottom: 0, width: '100%', height: 85, 
    backgroundColor: '#0A0E17', flexDirection: 'row', 
    justifyContent: 'space-around', alignItems: 'center', 
    borderTopWidth: 1, borderTopColor: '#1E2330' 
  },
  navItem: { alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  navLabel: { fontSize: 10, fontWeight: '700', marginTop: 4 },
});