import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, ScrollView, Image,
  StatusBar, Dimensions, Pressable,
  Animated, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; 
import { useTheme } from '../context/ThemeContext';

// --- Types & Interfaces ---
type ScreenState = 
  | 'welcome' | 'login' | 'signup' | 'home' | 'settings' 
  | 'profile' | 'chat' | 'generalSettings' | 'clinic' 
  | 'vitals' | 'emergency' | 'notifications';

interface HomeProps {
  onNavigate: (screen: ScreenState) => void;
}

const { width: SW } = Dimensions.get('window');

// --- Components ---

const GridBtn = ({ icon, label, accent, onPress, index }: any) => {
  const { isDarkMode } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      delay: index * 100 + 300,
      duration: 400,
      useNativeDriver: true
    }).start();
  }, []);

  return (
    <Animated.View style={[gridStyles.btnWrapper, { opacity, transform: [{ scale }] }]}>
      <Pressable 
        style={[gridStyles.btn, { backgroundColor: isDarkMode ? '#1E2330' : '#FFFFFF' }]} 
        onPress={onPress}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={[gridStyles.iconCircle, { backgroundColor: accent + '15' }]}>
          <MaterialCommunityIcons name={icon} size={28} color={accent} />
        </View>
        <Text style={[gridStyles.label, { color: isDarkMode ? '#FFFFFF' : '#191D32' }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
};

const ECGLine = ({ color, bpm }: { color: string; bpm: number }) => {
  const pts = [[0,20],[10,20],[16,4],[18,32],[20,20],[46,10],[48,28],[50,20],[76,5],[78,33],[100,20]];
  const W = SW - 80;

  return (
    <View style={ecgStyles.wrapper}>
      {pts.map(([x, y], i) => {
        if (i === 0) return null;
        const [px, py] = pts[i - 1];
        const scaleX = W / 100;
        const x1 = px * scaleX, x2 = x * scaleX;
        const dx = x2 - x1, dy = y - py;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View key={i} style={{ 
            position: 'absolute', left: x1, top: py, width: len, height: 2, 
            backgroundColor: color, transform: [{ rotate: `${angle}deg` }] 
          }} />
        );
      })}
    </View>
  );
};

const TabItem = ({ icon, label, active, onPress }: any) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity style={s.tabItem} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={24} color={active ? colors.primary : '#8A93A6'} />
      <Text style={[s.tabLabel, { color: active ? colors.primary : '#8A93A6' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// --- Main Component ---

export default function HomeScreen({ onNavigate }: HomeProps) {
  const { colors, isDarkMode } = useTheme();
  const [userName, setUserName] = useState('جاري التحميل...');
  const [vitals, setVitals] = useState({ heart_rate: 0 });
  const [hasNewNotif, setHasNewNotif] = useState(false);
interface HomeProps {
  onNavigate: (screen: any) => void;
}
  useEffect(() => {
    fetchUserData();
    const subscription = subscribeToNotifications();
    return () => {
        if(subscription) supabase.removeChannel(subscription);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. جلب اسم المستخدم الحقيقي
        const { data: profile } = await supabase
          .from('patients')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        if (profile) setUserName(profile.full_name);

        // 2. جلب نبضات القلب الحقيقية (آخر قراءة)
        const { data: lastVital } = await supabase
          .from('vitals')
          .select('heart_rate')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (lastVital) setVitals(lastVital);
      }
    } catch (e) {
      console.log("Error fetching data:", e);
      setUserName("مستخدم رفيق");
    }
  };

  const subscribeToNotifications = () => {
    // تفعيل الـ Realtime للتنبيهات
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications' }, 
        () => setHasNewNotif(true)
      )
      .subscribe();
    return channel;
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Top Nav */}
      <View style={s.topNav}>
        <View style={s.topNavLeft}>
          <TouchableOpacity 
            onPress={() => onNavigate('profile')}
            style={[s.avatarPlaceholder, { backgroundColor: isDarkMode ? '#1E2330' : '#F1F5F9' }]}
          >
            <MaterialCommunityIcons name="account-circle" size={40} color={colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={[s.greetText, { color: colors.text + '80' }]}>مرحباً بك،</Text>
            <Text style={[s.greetName, { color: colors.text }]}>{userName}</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={[s.iconBtn, { backgroundColor: isDarkMode ? '#1E2330' : '#F1F5F9' }]}
          onPress={() => {
            setHasNewNotif(false);
            onNavigate('notifications');
          }}
        >
          <MaterialCommunityIcons 
            name={hasNewNotif ? "bell-badge-outline" : "bell-outline"} 
            size={22} 
            color={hasNewNotif ? "#FF453A" : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Vital Signs Card (Dynamic Heart Rate) */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => onNavigate('vitals')}
          style={[s.ecgCard, { backgroundColor: isDarkMode ? '#1E2330' : '#191D32' }]}
        >
          <View style={s.ecgHeader}>
            <Text style={s.ecgTitle}>معدل ضربات القلب</Text>
            <Text style={s.ecgValue}>
                {vitals.heart_rate > 0 ? vitals.heart_rate : '--'} 
                <Text style={{fontSize: 14}}> BPM</Text>
            </Text>
          </View>
          <ECGLine color={vitals.heart_rate > 100 ? '#FF3B3B' : '#00C2FF'} bpm={vitals.heart_rate} />
        </TouchableOpacity>

        {/* Action Grid */}
        <View style={s.grid}>
          <GridBtn index={0} icon="alert-octagon" label="الطوارئ (SOS)" accent="#FF453A" onPress={() => onNavigate('emergency')} />
          <GridBtn index={1} icon="heart-pulse" label="العلامات الحيوية" accent="#00C2FF" onPress={() => onNavigate('vitals')} />
          <GridBtn index={2} icon="chat-outline" label="المحادثة" accent="#A855F7" onPress={() => onNavigate('chat')} />
          {/* تم تغيير "الأدوية" إلى "الصيدلية" */}
          <GridBtn index={3} icon="storefront-outline" label="الصيدلية" accent="#10B981" onPress={() => onNavigate('clinic')} />
        </View>

      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={[s.bottomNav, { 
        backgroundColor: isDarkMode ? '#0A0E17' : '#FFFFFF', 
        borderTopColor: isDarkMode ? '#1E2330' : '#EEE' 
      }]}>
        <TabItem icon="home" label="الرئيسية" active onPress={() => {}} />
        <TabItem icon="chart-bar" label="التقارير" onPress={() => onNavigate('vitals')} />
        
        <TouchableOpacity style={s.sosCentral} onPress={() => onNavigate('emergency')}>
            <MaterialCommunityIcons name="alert" size={30} color="#FFF" />
        </TouchableOpacity>

        <TabItem icon="message-outline" label="المحادثة" onPress={() => onNavigate('chat')} />
        <TabItem icon="account-outline" label="حسابي" onPress={() => onNavigate('profile')} />
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---

const s = StyleSheet.create({
  safe: { flex: 1 },
  topNav: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  topNavLeft: { flexDirection: 'row-reverse', alignItems: 'center' },
  avatarPlaceholder: { width: 45, height: 45, borderRadius: 22.5, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  greetText: { fontSize: 12, textAlign: 'right' },
  greetName: { fontSize: 18, fontWeight: '800', textAlign: 'right' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  ecgCard: { borderRadius: 25, padding: 25, marginBottom: 25, elevation: 10, shadowColor: '#00C2FF', shadowOpacity: 0.2, shadowRadius: 15 },
  ecgHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  ecgTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '600' },
  ecgValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 85,
    flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, borderTopWidth: 1
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  tabLabel: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  sosCentral: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF453A',
    justifyContent: 'center', alignItems: 'center', marginTop: -35,
    borderWidth: 5, borderColor: '#0A0E17', elevation: 5, shadowColor: '#FF453A', shadowOpacity: 0.3, shadowRadius: 10
  }
});

const gridStyles = StyleSheet.create({
  btnWrapper: { width: '47%', marginBottom: 15 },
  btn: { width: '100%', borderRadius: 24, padding: 20, alignItems: 'center', elevation: 2 },
  iconCircle: { width: 55, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '800' },
});

const ecgStyles = StyleSheet.create({ wrapper: { height: 40, marginTop: 10 } });