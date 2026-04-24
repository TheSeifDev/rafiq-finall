import React, { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import * as Localization from 'expo-localization';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAppStore } from './src/store/app.store';
import { linking } from './src/navigation/linking';
import { useAuthStore } from './src/store/auth.store';
import { initNotificationsOnce } from './src/lib/notifications/medicationReminders';

function Boot(): React.JSX.Element {
  const initialize = useAuthStore((state) => state.initialize);
  const language = useAppStore((state) => state.language);
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    hydrate(Localization.getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en').catch(() => undefined);
    initialize().catch(() => undefined);
    initNotificationsOnce().catch(() => undefined);
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
      <NavigationContainer linking={linking}>
        <Boot />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
