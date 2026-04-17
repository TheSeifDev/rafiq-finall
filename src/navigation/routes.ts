export const Routes = {
  // Auth screens
  Welcome: 'Welcome',
  Login: 'Login',
  SignUp: 'SignUp',
  // Tab roots
  HomeTab: 'HomeTab',
  VitalsTab: 'VitalsTab',
  EmergencyTab: 'EmergencyTab',
  ChatTab: 'ChatTab',
  ProfileTab: 'ProfileTab',
  // Home stack
  Home: 'Home',
  Notifications: 'Notifications',
  AddPatient: 'AddPatient',
  Medication: 'Medication',
  // Vitals stack
  Vitals: 'Vitals',
  // Profile stack
  Profile: 'Profile',
  Settings: 'Settings',
  GeneralSettings: 'GeneralSettings',
  // Standalone
  Emergency: 'Emergency',
  Chat: 'Chat',
} as const;

export type RouteName = (typeof Routes)[keyof typeof Routes];
