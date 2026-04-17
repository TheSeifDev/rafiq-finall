import React, { useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, ScrollView, StatusBar,
  Dimensions, Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width: SW } = Dimensions.get('window');

type Props = {
  onNavigate: (screen: string) => void;
};

const DashboardScreen: React.FC<Props> = ({ onNavigate }) => {
  const { colors, isDarkMode } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    Animated.timing(chartAnim, {
      toValue: 1,
      duration: 800,
      delay: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Header */}
        <Animated.View
          style={[
            styles.headerContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY }]
            }
          ]}
        >
          <View style={styles.userInfo}>
            <Text style={[styles.welcomeText, { color: colors.subText }]}>مرحباً بك،</Text>
            <Text style={[styles.userName, { color: colors.text }]}>عائلة رفيق 👋</Text>
          </View>
          <View style={[styles.headerIconCircle, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="chart-areaspline" size={24} color={colors.primary} />
          </View>
        </Animated.View>

        {/* Actions */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>بدء قياسات جديدة</Text>
        <View style={styles.actionRow}>
          <ActionCard index={0} icon="water" color="#1B3A6B" label="ضغط الدم" />
          <ActionCard index={1} icon="heart-pulse" color="#E8674A" label="النبض" />
          <ActionCard index={2} icon="needle" color="#2AABB8" label="السكر" />
        </View>

        {/* Activity */}
        <View style={styles.sectionHeaderRow}>
          <TouchableOpacity>
            <Text style={[styles.seeMore, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={[styles.sectionLabel, { color: colors.text, marginBottom: 0 }]}>النشاط الأخير</Text>
        </View>

        <View style={styles.activityRow}>
          <ActivityCard index={0} label="السكر" value="74" color="#2AABB8" icon="check-circle" status="مستقر" />
          <ActivityCard index={1} label="النبض" value="98" color="#E8674A" icon="heart" status="مستقر" />
          <ActivityCard index={2} label="الضغط" value="118/76" color="#1B3A6B" icon="shield-check" status="مستقر" />
        </View>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>ملخص الحالة الأسبوعي</Text>
        <Animated.View
          style={[
            styles.chartCard,
            {
              backgroundColor: colors.card,
              opacity: chartAnim,
              transform: [{
                translateY: chartAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [40, 0],
                })
              }]
            }
          ]}
        >
          <View style={styles.chartHeader}>
            <MaterialCommunityIcons name="trending-up" size={20} color="#4ADE80" />
            <Text style={[styles.chartTitle, { color: colors.text }]}>تطور المؤشرات الصحية</Text>
          </View>
          <View style={styles.chartLegendFloating}>
            <LegendDot color="#2AABB8" label="مستوى السكر" />
            <LegendDot color="#1B3A6B" label="ضغط الدم" />
          </View>
          <View style={[styles.chartPlaceholder, { backgroundColor: colors.background }]} />
        </Animated.View>

      </ScrollView>

      <View style={[styles.bottomNav, { backgroundColor: colors.card }]}>
        <NavButton icon="cog" label="الإعدادات" onPress={() => onNavigate('settings')} color={colors.subText} />
        <NavButton icon="chat-processing-outline" label="دردشة" onPress={() => onNavigate('chat')} color={colors.subText} badge="1" />
        <NavButton icon="stethoscope" label="العيادة" onPress={() => {}} color={colors.subText} />
        <NavButton icon="heart-pulse" label="الرئيسية" onPress={() => {}} color={colors.primary} active />
      </View>

    </SafeAreaView>
  );
};

// ================= TYPES =================

type ActionCardProps = {
  icon: string;
  color: string;
  label: string;
  index: number;
};

type ActivityCardProps = {
  label: string;
  value: string;
  color: string;
  icon: string;
  status: string;
  index: number;
};

type NavButtonProps = {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
  active?: boolean;
  badge?: string;
};

type LegendDotProps = {
  color: string;
  label: string;
};

// ================= COMPONENTS =================

const ActionCard: React.FC<ActionCardProps> = ({ icon, color, label, index }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: index * 150,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: anim,
        transform: [{
          translateX: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          })
        }]
      }}
    >
      <TouchableOpacity style={[styles.actionCard, { backgroundColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color="#FFF" />
        <Text style={styles.actionText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ActivityCard: React.FC<ActivityCardProps> = ({ label, value, color, icon, status, index }) => {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay: index * 200 + 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: anim,
        transform: [{
          translateY: anim.interpolate({
            inputRange: [0, 1],
            outputRange: [30, 0],
          })
        }]
      }}
    >
      <View style={[styles.activityCard, { backgroundColor: colors.card, borderTopColor: color }]}>
        <Text style={{ color }}>{label}</Text>
        <Text style={{ color: colors.text }}>{value}</Text>
        <Text style={{ color: colors.subText }}>{status}</Text>
      </View>
    </Animated.View>
  );
};

const NavButton: React.FC<NavButtonProps> = ({ icon, label, onPress, color, active, badge }) => (
  <TouchableOpacity style={styles.navItem} onPress={onPress}>
    <MaterialCommunityIcons name={icon as any} size={26} color={color} />
    {badge && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
    <Text style={[styles.navText, { color, fontWeight: active ? 'bold' : '400' }]}>{label}</Text>
  </TouchableOpacity>
);

const LegendDot: React.FC<LegendDotProps> = ({ color, label }) => {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: colors.subText }}>{label}</Text>
      <View style={{ width: 8, height: 8, backgroundColor: color, borderRadius: 4, marginLeft: 6 }} />
    </View>
  );
};

// ================= STYLES =================

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 110 },

  headerContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10
  },

  userInfo: { alignItems: 'flex-end' },
  welcomeText: { fontSize: 14 },
  userName: { fontSize: 22, fontWeight: 'bold' },

  headerIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center'
  },

  sectionLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 15
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },

  seeMore: { fontSize: 13 },

  actionRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 30
  },

  actionCard: {
    borderRadius: 20,
    padding: 18,
    alignItems: 'center'
  },

  actionText: {
    color: '#FFF',
    marginTop: 10
  },

  activityRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 30
  },

  activityCard: {
    borderRadius: 18,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 4
  },

  chartCard: {
    borderRadius: 25,
    padding: 20
  },

  chartHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10
  },

  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8
  },

  chartPlaceholder: {
    height: 120,
    borderRadius: 15,
    marginTop: 10,
    opacity: 0.5
  },

  chartLegendFloating: {
    alignItems: 'flex-end'
  },

  bottomNav: {
    flexDirection: 'row-reverse',
    height: 85,
    position: 'absolute',
    bottom: 0,
    width: '100%'
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },

  navText: {
    fontSize: 10,
    marginTop: 5
  },

  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },

  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold'
  }
});

export default DashboardScreen;