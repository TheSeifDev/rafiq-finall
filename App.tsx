import React, { useEffect } from 'react';
import 'react-native-get-random-values';
import { LogBox, View } from 'react-native';
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
import { initializeNotificationChannels } from './src/lib/notifications/notificationPipeline';

// ─── Disable auto-server-registration in Expo Go ────────────
if (Constants.appOwnership === 'expo') {
  Notifications.setAutoServerRegistrationEnabledAsync(false).catch(() => {});
}

// Suppress any residual LogBox warnings from the SDK
LogBox.ignoreLogs([
  'expo-notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

// ─── Boot component ─────────────────────────────────────────
// ✅ I18nManager is NOT used here. RTL direction is set ONCE in
// index.ts at startup and NEVER mutated again during the session.
// All components derive isRTL from: language === 'ar' (Zustand).

function Boot(): React.JSX.Element {
  const initialize = useAuthStore((state) => state.initialize);
  const language = useAppStore((state) => state.language);
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(Localization.getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en').catch(() => undefined);
    initialize().catch(() => undefined);

    // Initialize all notification channels and handlers
    const setupNotifications = async () => {
      await initializeNotificationChannels().catch(console.warn);
      await initNotificationsOnce().catch((e) => console.warn('[Notifications] Init failed:', e));
    };
    setupNotifications();
  }, [hydrate, initialize]);

  // ✅ LOCKED direction container — prevents any child from
  // accidentally flipping the layout. Uses Zustand store, NOT I18nManager.
  const isRTL = language === 'ar';

  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <RootNavigator />
    </View>
  );
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
