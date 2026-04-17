import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
  Dimensions,
  Pressable,
  Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface GeneralProps {
  onBack: () => void;
}

const { width: SW } = Dimensions.get('window');

const SettingRow = ({
  icon,
  label,
  children,
  onPress,
  index,
  colors,
  isDarkMode,
  isRTL
}: any) => {

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const rowDirection = isRTL ? 'row-reverse' : 'row';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={{
        width: '100%',
        opacity,
        transform: [{ translateY }, { scale }]
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.settingItem,
          {
            backgroundColor: colors.card,
            flexDirection: rowDirection,
            opacity: pressed ? 0.9 : 1,
          }
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
          <MaterialCommunityIcons
            name={icon as any}
            size={22}
            color={isDarkMode ? colors.primary : "#191D32"}
          />
        </View>

        <Text style={[styles.settingLabel, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
        </Text>

        {children}
      </Pressable>
    </Animated.View>
  );
};

const GeneralSettingsScreen: React.FC<GeneralProps> = ({ onBack }) => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const isRTL = true;
  const rowDirection = isRTL ? 'row-reverse' : 'row';

  const titleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(titleOpacity, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#191D32' }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { flexDirection: rowDirection }]}>
        <TouchableOpacity onPress={onBack} style={styles.backCircle}>
          <MaterialCommunityIcons
            name={isRTL ? "arrow-right" : "arrow-left"}
            size={26}
            color="#FFF"
          />
        </TouchableOpacity>

        <Animated.Text
          style={[
            styles.headerTitle,
            { opacity: titleOpacity }
          ]}
        >
          {isRTL ? 'إعدادات التطبيق' : 'App Settings'}
        </Animated.Text>

        <View style={{ width: 45 }} />
      </View>

      <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >

          <Text style={[styles.sectionHeader, { color: colors.subText, textAlign: isRTL ? 'right' : 'left' }]}>
            {isRTL ? 'تفضيلات النظام' : 'System Preferences'}
          </Text>

          <SettingRow
            index={1}
            icon="translate"
            label={isRTL ? 'اللغة (العربية)' : 'Language (English)'}
            isRTL={isRTL}
            colors={colors}
            isDarkMode={isDarkMode}
          >
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AR</Text>
            </View>
          </SettingRow>

          <SettingRow
            index={2}
            icon={isDarkMode ? "weather-night" : "weather-sunny"}
            label={isRTL ? 'الوضع الليلي' : 'Dark Mode'}
            isRTL={isRTL}
            colors={colors}
            isDarkMode={isDarkMode}
          >
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#CBD5E1", true: colors.primary }}
              thumbColor="#FFF"
            />
          </SettingRow>

          <View style={styles.divider} />

          <Text style={[styles.sectionHeader, { color: colors.subText, textAlign: isRTL ? 'right' : 'left' }]}>
            {isRTL ? 'التنبيهات' : 'Alerts'}
          </Text>

          <SettingRow
            index={3}
            icon="bell-outline"
            label={isRTL ? 'إشعارات القياسات' : 'Vitals Notifications'}
            isRTL={isRTL}
            colors={colors}
            isDarkMode={isDarkMode}
          >
            <MaterialCommunityIcons name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={colors.subText} />
          </SettingRow>

          <SettingRow
            index={4}
            icon="shield-check-outline"
            label={isRTL ? 'خصوصية البيانات' : 'Data Privacy'}
            isRTL={isRTL}
            colors={colors}
            isDarkMode={isDarkMode}
          >
            <MaterialCommunityIcons name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={colors.subText} />
          </SettingRow>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF'
  },

  backCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden'
  },

  content: { padding: 25, paddingTop: 35 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 15,
    opacity: 0.7
  },

  settingItem: {
    height: 72,
    borderRadius: 22,
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2
  },

  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center'
  },

  settingLabel: {
    fontSize: 16,
    flex: 1,
    marginHorizontal: 15,
    fontWeight: '600'
  },

  badge: {
    backgroundColor: '#0077C820',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },

  badgeText: {
    color: '#0077C8',
    fontSize: 12,
    fontWeight: 'bold'
  },

  divider: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 20
  }
});

export default GeneralSettingsScreen;