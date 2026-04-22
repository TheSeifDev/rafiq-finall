import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Routes } from './routes';
import type { AuthStackParamList } from '../types/navigation';

// Screens
import WelcomeScreen from '../screens/Welcome';
import LoginScreen from '../screens/Login';
import SignUpScreen from '../screens/SignUp';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#0A0F1C' },
      }}
    >
      <Stack.Screen name={Routes.Welcome} component={WelcomeScreen} />
      <Stack.Screen name={Routes.Login} component={LoginScreen} />
      <Stack.Screen name={Routes.SignUp} component={SignUpScreen} />
    </Stack.Navigator>
  );
}