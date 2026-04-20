import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/auth.store';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { VitalsScreen } from '../screens/VitalsScreen';
import { EmergencyScreen } from '../screens/EmergencyScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MedicationsScreen } from '../screens/MedicationsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { BottomTabBar } from '../components/ui/BottomTabBar';
import type { AuthStackParamList, MainTabParamList, ProfileStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackNavigator(): React.JSX.Element {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'الملف الشخصي' }} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right', title: 'الإعدادات' }} />
      <ProfileStack.Screen name="Medications" component={MedicationsScreen} options={{ animation: 'slide_from_right', title: 'الأدوية' }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ animation: 'fade', title: 'تعديل الملف' }} />
    </ProfileStack.Navigator>
  );
}

function MainTabs(): React.JSX.Element {
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

export function RootNavigator(): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return <WelcomeScreen />;
  }

  return session ? (
    <MainTabs />
  ) : (
    <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}
