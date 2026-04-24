import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { VitalsScreen } from '../screens/VitalsScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MedicationsScreen } from '../screens/MedicationsScreen';
import { EmergencyProfileScreen } from '../screens/EmergencyProfileScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { PrivacyScreen } from '../screens/PrivacyScreen';
import { NotificationCenterScreen } from '../screens/NotificationCenterScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { BottomTabBar } from '../components/ui/BottomTabBar';
import { useAppStore } from '../store/app.store';
import { translations } from '../constants/translations';
import type { MainTabParamList, MainStackParamList, ProfileStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

// ─── Profile Stack (nested inside Profile tab) ──────────────
function ProfileStackNavigator(): React.JSX.Element {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStackNav.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
      <ProfileStackNav.Screen name="Medications" component={MedicationsScreen} options={{ animation: 'slide_from_right' }} />
      <ProfileStackNav.Screen name="EmergencyProfile" component={EmergencyProfileScreen} options={{ animation: 'slide_from_right' }} />
      <ProfileStackNav.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ animation: 'slide_from_right' }} />
      <ProfileStackNav.Screen name="Privacy" component={PrivacyScreen} options={{ animation: 'slide_from_right' }} />
    </ProfileStackNav.Navigator>
  );
}

// ─── Bottom Tabs ─────────────────────────────────────────────
function MainTabs(): React.JSX.Element {
  const language = useAppStore((s) => s.language);
  const t = translations[language];

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t.home }} />
      <Tab.Screen name="Vitals" component={VitalsScreen} options={{ title: t.vitals }} />
      <Tab.Screen name="Emergency" component={EmergencyScreen} options={{ title: t.emergency }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: t.chat }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: t.profile }} />
    </Tab.Navigator>
  );
}

// ─── Main Navigator (Tabs + modal stack screens) ─────────────
export function MainNavigator(): React.JSX.Element {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => false);
    return () => sub.remove();
  }, []);

  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen
        name="NotificationCenter"
        component={NotificationCenterScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <MainStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </MainStack.Navigator>
  );
}
