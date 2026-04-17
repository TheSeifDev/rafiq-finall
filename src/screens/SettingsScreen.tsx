import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Pressable,
  Animated,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SettingsProps {
  onNavigate: (screen: any) => void; 
  onLogout: () => void;
  onBack: () => void;
}

const SettingItem = ({
  icon,
  label,
  onPress,
  index,
  colors,
  isDestructive = false
}: any) => {
  const scale = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        width: '100%',
        opacity: fade,
        transform: [
          { scale },
          {
            translateY: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })
          }
        ]
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.menuItem,
          {
            backgroundColor: colors.card,
            opacity: pressed ? 0.9 : 1,
          }
        ]}
      >
        <MaterialCommunityIcons
          name="chevron-left"
          size={20}
          color={colors.subText}
          style={{ opacity: 0.3 }}
        />

        <Text
          style={[
            styles.menuText,
            {
              color: isDestructive ? "#FF4B4B" : colors.text,
              textAlign: 'right',
              fontWeight: isDestructive ? 'bold' : '600'
            }
          ]}
        >
          {label}
        </Text>

        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDestructive
                ? '#FF4B4B15'
                : colors.primary + '15'
            }
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={isDestructive ? "#FF4B4B" : colors.primary}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
};

const SettingsScreen: React.FC<SettingsProps> = ({
  onNavigate,
  onLogout,
  onBack,
}) => {
  const { colors, isDarkMode } = useTheme();

  const headerFade = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDarkMode ? '#0A0E17' : '#191D32' }]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backCircle}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-right" size={26} color="#FFF" />
        </TouchableOpacity>

        <Animated.Text style={[styles.headerTitle, { opacity: headerFade }]}>
          الإعدادات
        </Animated.Text>

        <View style={{ width: 45 }} />
      </View>
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: colors.background,
            opacity: contentAnim,
            transform: [{
              translateY: contentAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }]
          }
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.subText }]}>
          الحساب والتطبيق
        </Text>

        <SettingItem
          index={1}
          icon="account-circle-outline"
          label="الملف الشخصي"
          onPress={() => onNavigate('profile')}
          colors={colors}
        />

        <SettingItem
          index={2}
          icon="palette-outline"
          label="المظهر والتفضيلات"
          onPress={() => onNavigate('generalSettings')}
          colors={colors}
        />

        <SettingItem
          index={3}
          icon="bell-outline"
          label="التنبيهات والاشعارات"
          onPress={() => onNavigate('notifications')} 
          colors={colors}
        />

        <View style={[styles.divider, { backgroundColor: colors.subText + '15' }]} />

        <SettingItem
          index={4}
          icon="logout-variant"
          label="تسجيل الخروج"
          onPress={onLogout}
          colors={colors}
          isDestructive
        />
        <View style={styles.footer}>
          <View style={[styles.versionBadge, { backgroundColor: colors.card }]}>
            <Text style={[styles.versionText, { color: colors.subText }]}>
              نسخة رفيق v2.0.4
            </Text>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: Platform.OS === 'ios' ? 70 : 90,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold'
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 35,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'right',
    marginRight: 10,
    opacity: 0.6,
    letterSpacing: 0.5
  },
  menuItem: {
    height: 72,
    borderRadius: 22,
    paddingHorizontal: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginRight: 15,
  },
  divider: {
    height: 1,
    width: '90%',
    alignSelf: 'center',
    marginVertical: 20,
  },
  footer: {
    marginTop: 'auto',
    marginBottom: Platform.OS === 'ios' ? 10 : 25,
    alignItems: 'center'
  },
  versionBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  versionText: {
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.7
  }
});

export default SettingsScreen;