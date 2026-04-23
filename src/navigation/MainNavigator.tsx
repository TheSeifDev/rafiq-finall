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
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { BottomTabBar } from '../components/ui/BottomTabBar';
import type { MainTabParamList, ProfileStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackNavigator(): React.JSX.Element {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'الملف الشخصي' }}
      />
      <ProfileStackNav.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ animation: 'slide_from_right', title: 'الإعدادات' }}
      />
      <ProfileStackNav.Screen
        name="Medications"
        component={MedicationsScreen}
        options={{ animation: 'slide_from_right', title: 'الأدوية' }}
      />
      <ProfileStackNav.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'fade', title: 'تعديل الملف' }}
      />
    </ProfileStackNav.Navigator>
  );
}

export function MainNavigator(): React.JSX.Element {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => false);
    return () => sub.remove();
  }, []);

  return (
    <Tab.Navigator tabBar={(props) => <BottomTabBar {...props} />}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الرئيسية', headerShown: false }} />
      <Tab.Screen name="Vitals" component={VitalsScreen} options={{ title: 'المؤشرات', headerShown: false }} />
      <Tab.Screen name="Emergency" component={EmergencyScreen} options={{ title: 'الطوارئ', headerShown: false }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'المحادثة', headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: 'الملف', headerShown: false }} />
    </Tab.Navigator>
  );
}
