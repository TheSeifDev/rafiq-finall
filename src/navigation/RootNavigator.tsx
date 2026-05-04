import React, { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/auth.store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingOverlay } from '../components/ui/LoadingOverlay';
import { Screen } from '../components/ui/Screen';
import { requestNotificationPermission, IS_EXPO_GO, scheduleMedicationReminder } from '../lib/notifications/notificationService';

export function RootNavigator(): React.JSX.Element {
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);

  // ✅ Request local notification permissions on mount
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

  // ✅ FIX B4: Foreground notification listener — re-schedules in Expo Go.
  // Expo Go's DAILY trigger is unreliable (fires once then stops).
  // When a med notification is delivered, we parse hour/minute from the
  // identifier and re-schedule it for the same time tomorrow via TIME_INTERVAL.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      const medId = data?.medicationId as string | undefined;

      // Only re-schedule medication reminders in Expo Go
      if (!medId || !IS_EXPO_GO) return;

      const identifier = notification.request.identifier;
      // Parse hour/minute from identifier: med_${id}_${hour}_${minute}
      const parts = identifier.split('_');
      if (parts.length >= 4) {
        const hour = parseInt(parts[parts.length - 2], 10);
        const minute = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(hour) && !isNaN(minute)) {
          try {
            // Extract medication name from notification body
            const bodyText = notification.request.content.body ?? '';
            const medName = bodyText.replace(/^(حان موعد |Time for: )/, '') || medId;

            await scheduleMedicationReminder({
              medicationId: medId,
              medicationName: medName,
              hour,
              minute,
            });
          } catch (err) {
            console.warn('[Notifications] Expo Go re-schedule failed:', err);
          }
        }
      }
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
