import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/auth.store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { Screen } from '../components/ui/Screen';
import { requestNotificationPermission } from '../lib/notifications/notificationService';

export function RootNavigator(): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);

  // ✅ Request local notification permissions on mount (direct, no safety wrapper)
  useEffect(() => {
    requestNotificationPermission()
      .then((granted) => {
        if (granted) {
          console.log('[Notifications] Local notification permission granted');
        } else {
          console.warn('[Notifications] Local notification permission denied');
        }
      })
      .catch((e) => console.warn('[Notifications] Permission request failed:', e));
  }, []);

  // ✅ Foreground notification listener (direct expo-notifications)
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((_notification) => {
      // Foreground notification received — the handler in notificationService.ts
      // ensures it is displayed with alert + sound + badge.
    });
    return () => sub.remove();
  }, []);

  if (loading) {
    return (
      <Screen>
        <LoadingOverlay text="جاري التحميل..." />
      </Screen>
    );
  }

  return session ? <MainNavigator /> : <AuthNavigator />;
}
