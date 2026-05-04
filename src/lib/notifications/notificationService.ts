/**
 * Local Notification Service for Rafiq.
 *
 * ✅ Uses expo-notifications DIRECTLY — local notifications work in Expo Go.
 * ❌ NO push tokens, NO getExpoPushTokenAsync, NO addPushTokenListener.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationPrefs } from '../../store/app.store';

// ─── Global handler (call at module level → runs before any scheduling) ──

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,   // ← الجديد
    shouldShowList: true,     // ← الجديد
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
// ─── Permission ─────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Android channel ────────────────────────────────────────

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('medications', {
    name: 'Medication Reminders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00C2FF',
    sound: 'default',
  });
}

// ─── Identifier builder ─────────────────────────────────────

export function buildIdentifier(medicationId: string, hour: number, minute: number): string {
  return `med_${medicationId}_${hour}_${minute}`;
}

// ─── Schedule a single daily reminder ───────────────────────

export async function scheduleMedicationReminder(params: {
  medicationId: string;
  medicationName: string;
  hour: number;
  minute: number;
  language?: 'ar' | 'en';
  prefs?: NotificationPrefs;
}): Promise<string> {
  const { medicationId, medicationName, hour, minute, language = 'ar' } = params;
  const identifier = buildIdentifier(medicationId, hour, minute);

  // Cancel existing to prevent duplicates
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  // Ensure channel exists on Android
  await ensureAndroidChannel();

  const title =
    language === 'ar'
      ? '💊 وقت الدواء!'
      : '💊 Medication reminder';
  const body =
    language === 'ar'
      ? `حان موعد ${medicationName}`
      : `Time for: ${medicationName}`;

  return Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      data: { screen: 'NotificationCenter', medicationId },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'medications' }),
    },
trigger: {
  type: Notifications.SchedulableTriggerInputTypes.DAILY,
  hour,
  minute,
},
  });
}

// ─── Cancel all reminders for one medication ────────────────

export async function cancelAllRemindersForMedication(medicationId: string): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const mine = all.filter((n) => n.identifier.startsWith(`med_${medicationId}_`));
  await Promise.all(mine.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// ─── Cancel ALL notifications ───────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── List all scheduled ─────────────────────────────────────

export async function getScheduledNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

// ─── Test notification (immediate, 5 second delay) ──────────

export async function sendTestNotification(language: 'ar' | 'en'): Promise<string> {
  await ensureAndroidChannel();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: language === 'ar' ? '🔔 إشعار تجريبي' : '🔔 Test notification',
      body: language === 'ar' ? 'إشعارات رفيق تعمل بنجاح!' : 'Rafiq notifications are working!',
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'medications' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
    },
  });
}

// ─── Quiet hours helper ─────────────────────────────────────

export function isQuietHours(now: Date, prefs: NotificationPrefs): boolean {
  if (!prefs.quietHoursEnabled) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
  const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);

  const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
