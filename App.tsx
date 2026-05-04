import React, { useEffect } from 'react';
import { I18nManager, LogBox, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/app.store';
import { linking } from './src/navigation/linking';
import { useAuthStore } from './src/store/auth.store';
import { initNotificationsOnce } from './src/lib/notifications/medicationReminders';
import { navigationRef } from './src/navigation/MainNavigator';

// ─── Disable auto-server-registration in Expo Go ────────────
// Prevents future getDevicePushTokenAsync calls from the SDK's
// internal auto-registration system. Safe no-op in production.
if (Constants.appOwnership === 'expo') {
  Notifications.setAutoServerRegistrationEnabledAsync(false).catch(() => {});
}

// Suppress any residual LogBox warnings from the SDK
LogBox.ignoreLogs([
  'expo-notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

function Boot(): React.JSX.Element {
  const initialize = useAuthStore((state) => state.initialize);
  const language = useAppStore((state) => state.language);
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(Localization.getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en').catch(() => undefined);
    initialize().catch(() => undefined);
    initNotificationsOnce().catch((e) => console.warn('[Notifications] Init failed:', e));
  }, [hydrate, initialize]);

  useEffect(() => {
    const shouldBeRTL = language === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      if (Platform.OS !== 'web') {
        // Requires app restart to fully apply.
      }
    }
  }, [language]);

  return <RootNavigator />;
}

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <Boot />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
