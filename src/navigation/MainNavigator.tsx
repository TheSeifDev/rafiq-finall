import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../store/ThemeContext';
import { Routes } from './routes';
import { spacing, radius, shadows, typography } from '../theme';
import type {
  MainTabParamList,
  HomeStackParamList,
  VitalsStackParamList,
  ProfileStackParamList,
} from '../types/navigation';

// Screens
import HomeScreen from '../screens/Home';
import NotificationsScreen from '../screens/Notifications';
import AddPatientScreen from '../screens/AddPatient';
import MedicationScreen from '../screens/Medication';
import VitalsScreen from '../screens/Vitals';
import EmergencyScreen from '../screens/Emergency';
import ChatScreen from '../screens/Chat';
import ProfileScreen from '../screens/Profile';
import SettingsScreen from '../screens/Settings';
import GeneralSettingsScreen from '../screens/GeneralSettings';

// ---------- Nested Stacks ----------

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
      <HomeStack.Screen name={Routes.Home} component={HomeScreen} />
      <HomeStack.Screen name={Routes.Notifications} component={NotificationsScreen} />
      <HomeStack.Screen name={Routes.AddPatient} component={AddPatientScreen} />
      <HomeStack.Screen name={Routes.Medication} component={MedicationScreen} />
    </HomeStack.Navigator>
  );
}

const VitalsStack = createNativeStackNavigator<VitalsStackParamList>();
function VitalsStackNavigator() {
  return (
    <VitalsStack.Navigator screenOptions={{ headerShown: false }}>
      <VitalsStack.Screen name={Routes.Vitals} component={VitalsScreen} />
    </VitalsStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_left' }}>
      <ProfileStack.Screen name={Routes.Profile} component={ProfileScreen} />
      <ProfileStack.Screen name={Routes.Settings} component={SettingsScreen} />
      <ProfileStack.Screen name={Routes.GeneralSettings} component={GeneralSettingsScreen} />
    </ProfileStack.Navigator>
  );
}

// ---------- Tab Navigator ----------
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_CONFIG: {
  name: keyof MainTabParamList;
  component: React.ComponentType<any>;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconFocused: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { name: Routes.ProfileTab, component: ProfileStackNavigator, label: 'الحساب', icon: 'account-outline', iconFocused: 'account' },
  { name: Routes.ChatTab, component: ChatScreen, label: 'المحادثة', icon: 'chat-outline', iconFocused: 'chat' },
  { name: Routes.EmergencyTab, component: EmergencyScreen, label: 'الطوارئ', icon: 'hospital-box-outline', iconFocused: 'hospital-box' },
  { name: Routes.VitalsTab, component: VitalsStackNavigator, label: 'المؤشرات', icon: 'heart-pulse', iconFocused: 'heart-pulse' },
  { name: Routes.HomeTab, component: HomeStackNavigator, label: 'الرئيسية', icon: 'home-outline', iconFocused: 'home' },
];

export function MainNavigator() {
  const { colors, isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? colors.surface : colors.background,
          borderTopWidth: 0,
          height: 70,
          paddingBottom: spacing.sm,
          paddingTop: spacing.xs,
          ...shadows.sm,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: '600',
        },
      }}
    >
      {TAB_CONFIG.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarLabel: tab.label,
            tabBarIcon: ({ focused, color, size }) => (
              <MaterialCommunityIcons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
