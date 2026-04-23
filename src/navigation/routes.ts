export const Routes = {
  // Auth screens
  Welcome: 'Welcome',
  Login: 'Login',
  SignUp: 'SignUp',
  TermsOfService: 'TermsOfService',
  PrivacyPolicy: 'PrivacyPolicy',

  // Main tabs
  Home: 'Home',
  Vitals: 'Vitals',
  Emergency: 'Emergency',
  Chat: 'Chat',
  Profile: 'Profile',

  // Profile stack
  ProfileMain: 'ProfileMain',
  Settings: 'Settings',
  Medications: 'Medications',
  EditProfile: 'EditProfile',
} as const;

export type RouteName = (typeof Routes)[keyof typeof Routes];