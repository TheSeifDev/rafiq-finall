/**
 * Navigation Theme — Production-grade tab bar configuration
 * Reduces height and sizes for cleaner appearance
 */
import { DefaultTheme } from '@react-navigation/native';
import { layout } from '../theme/layout';

export const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6366F1',
    background: 'transparent',
    card: '#FFFFFF',
    text: '#1F2937',
    border: '#E5E7EB',
    notification: '#EF4444',
  },
};

export const tabBarConfig = {
  height: 60,
  iconSize: 22,
  labelSize: 11,
  paddingVertical: 6,
  paddingHorizontal: 12,
  iconMargin: 2,
};

export const bottomTabBarOptions = {
  tabBarActiveTintColor: '#6366F1',
  tabBarInactiveTintColor: '#9CA3AF',
  tabBarStyle: {
    height: tabBarConfig.height,
    paddingTop: tabBarConfig.paddingVertical,
    paddingBottom: tabBarConfig.paddingVertical,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarIconStyle: {
    marginBottom: tabBarConfig.iconMargin,
  },
  tabBarLabelStyle: {
    fontSize: tabBarConfig.labelSize,
    fontWeight: '500',
    marginTop: 2,
  },
  headerShown: false,
};

export const stackScreenOptions = {
  animation: 'slide_from_right' as const,
  headerShown: false,
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
};