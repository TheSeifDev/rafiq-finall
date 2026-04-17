import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { Routes } from '../navigation/routes';

// Auth stack params
export type AuthStackParamList = {
  [Routes.Welcome]: undefined;
  [Routes.Login]: undefined;
  [Routes.SignUp]: undefined;
};

// Main tab params
export type MainTabParamList = {
  [Routes.HomeTab]: NavigatorScreenParams<HomeStackParamList>;
  [Routes.VitalsTab]: NavigatorScreenParams<VitalsStackParamList>;
  [Routes.EmergencyTab]: undefined;
  [Routes.ChatTab]: undefined;
  [Routes.ProfileTab]: NavigatorScreenParams<ProfileStackParamList>;
};

// Nested stacks within tabs
export type HomeStackParamList = {
  [Routes.Home]: undefined;
  [Routes.Notifications]: undefined;
  [Routes.AddPatient]: undefined;
  [Routes.Medication]: undefined;
};

export type VitalsStackParamList = {
  [Routes.Vitals]: undefined;
};

export type ProfileStackParamList = {
  [Routes.Profile]: undefined;
  [Routes.Settings]: undefined;
  [Routes.GeneralSettings]: undefined;
};

// Screen props helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type HomeStackScreenProps<T extends keyof HomeStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<HomeStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type VitalsStackScreenProps<T extends keyof VitalsStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<VitalsStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;
