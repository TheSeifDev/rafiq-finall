import type { LinkingOptions } from '@react-navigation/native';
import type { MainStackParamList } from './types';

export const linking: LinkingOptions<MainStackParamList> = {
  prefixes: ['rafiq://', 'https://rafiq.app'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Vitals: 'vitals',
          Medications: 'medications',
          Chat: 'chat',
          Profile: 'profile',
        },
      },
      Emergency: 'emergency',
      NotificationCenter: 'notifications',
      NotificationSettings: 'notification-settings',
    },
  },
};
