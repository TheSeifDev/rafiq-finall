import type { LinkingOptions } from '@react-navigation/native';
import type { MainTabParamList } from './types';

export const linking: LinkingOptions<MainTabParamList> = {
  prefixes: ['rafiq://', 'https://rafiq.app'],
  config: {
    screens: {
      Emergency: 'emergency',
    },
  },
};
