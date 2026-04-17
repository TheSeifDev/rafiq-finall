import React, { useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar,
  ScrollView,
  Animated,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../../lib/supabase'; 

interface ProfileProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
}

const ProfileScreen = ({ onBack, onNavigate }: ProfileProps) => {
  const { colors, isDarkMode } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    full_name: '',
    age: '',
    blood_type: '',
    allergies: ''
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchUserProfile();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true })
    ]).start();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('patients') 
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setProfileData({
            full_name: data.full_name || 'غير مسجل',
            age: data.age?.toString() || '--',
            blood_type: data.blood_type || '--',
            allergies: data.allergies || 'لا يوجد'
          });
        }
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? colors.card : '#D1E9F6' }]}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>الملف الشخصي</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <Animated.ScrollView 
          contentContainerStyle={styles.scrollContent}
          style={{ opacity: fadeAnim, transform: [{ translateY }] }}
        >
          
          <View style={styles.avatarSection}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
               <MaterialCommunityIcons name="account-outline" size={80} color={colors.primary} />
            </View>
            <TouchableOpacity>
              <Text style={[styles.editPhotoText, { color: colors.primary }]}>تعديل الصورة</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <InfoRow icon="account" label="الاسم" value={profileData.full_name} colors={colors} />
            <InfoRow icon="calendar-clock" label="العمر" value={profileData.age} colors={colors} />
            <InfoRow icon="water" label="فصيلة الدم" value={profileData.blood_type} colors={colors} />
            <InfoRow icon="alert-circle" label="حساسية" value={profileData.allergies} colors={colors} />
          </View>
        </Animated.ScrollView>
      )}

      <View style={[styles.bottomTab, { backgroundColor: colors.card, borderTopColor: colors.navBorder }]}>
          <TabItem icon="cog" label="الإعدادات" onPress={() => onNavigate('settings')} colors={colors} />
          <TabItem icon="chat-outline" label="دردشة" onPress={() => onNavigate('chat')} colors={colors} badge={1} />
          <TabItem icon="stethoscope" label="العيادة" onPress={() => onNavigate('clinic')} colors={colors} />
          <TabItem icon="home-variant" label="رئيسية" onPress={() => onNavigate('home')} colors={colors} active />
      </View>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value, colors }: any) => (
  <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
    <MaterialCommunityIcons name="chevron-left" size={20} color={colors.subText} />
    <Text style={[styles.infoText, { color: colors.text }]}>{label}: {value}</Text>
    <MaterialCommunityIcons name={icon} size={22} color={colors.primary} style={{marginLeft: 10}} />
  </View>
);

const TabItem = ({ icon, label, active, onPress, colors, badge }: any) => (
  <TouchableOpacity style={[styles.tabItem, active && { borderTopWidth: 2, borderTopColor: colors.primary }]} onPress={onPress}>
    {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
    <MaterialCommunityIcons name={icon} size={26} color={active ? colors.primary : colors.subText} />
    <Text style={[styles.tabLabel, { color: active ? colors.primary : colors.subText }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  backButton: { position: 'absolute', left: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { alignItems: 'center', paddingTop: 30, paddingBottom: 100 },
  avatarSection: { alignItems: 'center', marginBottom: 30 },
  avatarCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  editPhotoText: { marginTop: 10, fontSize: 16, fontWeight: '500' },
  infoContainer: { width: '90%' },
  infoCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 18, borderRadius: 12, marginBottom: 12, elevation: 2 },
  infoText: { flex: 1, textAlign: 'right', fontSize: 16, fontWeight: '500' },
  bottomTab: { position: 'absolute', bottom: 0, flexDirection: 'row', height: 85, width: '100%', borderTopWidth: 1, paddingBottom: 20 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, marginTop: 4, textAlign: 'center' },
  badge: { position: 'absolute', top: 5, right: 20, backgroundColor: '#E74C3C', borderRadius: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' }
});

export default ProfileScreen;