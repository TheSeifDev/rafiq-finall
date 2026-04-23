import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ─── Auth Stack ──────────────────────────────────────────────
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
};

// ─── Main Tab Navigator ─────────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Vitals: undefined;
  Emergency: undefined;
  Chat: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// ─── Profile Stack (nested inside Profile tab) ──────────────
export type ProfileStackParamList = {
  ProfileMain: undefined;
  Settings: undefined;
  Medications: undefined;
  EditProfile: undefined;
};

// ─── Screen-prop helpers ────────────────────────────────────
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    BottomTabScreenProps<MainTabParamList>
  >;