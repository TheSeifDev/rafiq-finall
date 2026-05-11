/**
 * Expo Go safety layer for notifications.
 *
 * HARD RULE: expo-notifications is NEVER imported at module scope.
 * It is loaded via dynamic `import()` ONLY inside functions that have
 * already confirmed we are NOT in Expo Go. This prevents the native
 * PushTokenAutoRegistration side-effect from firing in Expo Go.
 */
import { Platform } from 'react-native';

// ─── Runtime detection ───────────────────────────────────────

let _isExpoGo: boolean | null = null;

/**
 * Detect whether we are running inside Expo Go.
 * Uses expo-constants `executionEnvironment`.
 * Does NOT touch expo-notifications.
 */
export function isExpoGo(): boolean {
  if (_isExpoGo !== null) return _isExpoGo;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default ?? require('expo-constants');
    const env: string = Constants.executionEnvironment ?? '';
    _isExpoGo = env === 'storeClient'; // Expo Go
  } catch {
    _isExpoGo = false;
  }

  return _isExpoGo;
}

/**
 * Whether push notifications can be used in this environment.
 */
export function canUsePushNotifications(): boolean {
  return !isExpoGo();
}

// ─── Private: load module (only called when NOT in Expo Go) ──

/**
 * Dynamically import expo-notifications.
 * MUST only be called after confirming `isExpoGo() === false`.
 */
async function loadModule(): Promise<any> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

// ─── Safe wrappers ───────────────────────────────────────────

/**
 * Set up notification channels (Android) and foreground handler.
 * In Expo Go: does NOTHING — no import, no listeners, no registration.
 */
export async function safeInitNotifications(): Promise<void> {
  if (isExpoGo()) return; // ← hard exit, zero module contact

  const Notifications = await loadModule();
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (err) {
    console.warn('[Notifications] setNotificationHandler failed:', err);
  }

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('medications', {
        name: 'Medications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#00C2FF',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      await Notifications.setNotificationChannelAsync('general', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#00C2FF',
      });
    } catch (err) {
      console.warn('[Notifications] Channel setup failed:', err);
    }
  }
}

/**
 * Request notification permissions.
 * In Expo Go: returns `{ granted: false }` — no import.
 */
export async function safeRequestPermissions(): Promise<{ granted: boolean }> {
  if (isExpoGo()) return { granted: false };

  const Notifications = await loadModule();
  if (!Notifications) return { granted: false };

  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return { granted: true };
    const result = await Notifications.requestPermissionsAsync();
    return { granted: result.granted };
  } catch (err) {
    console.warn('[Notifications] Permission request failed:', err);
    return { granted: false };
  }
}

/**
 * Schedule a local notification safely.
 * In Expo Go: returns `null` — no import.
 */
export async function safeScheduleNotification(
  request: {
    content: {
      title: string;
      body: string;
      sound?: boolean;
      priority?: string;
      channelId?: string;
      data?: Record<string, unknown>;
    };
    trigger: {
      type: number;
      hour?: number;
      minute?: number;
      repeats?: boolean;
      seconds?: number;
    };
  },
): Promise<string | null> {
  if (isExpoGo()) return null;

  const Notifications = await loadModule();
  if (!Notifications) return null;

  try {
    return await Notifications.scheduleNotificationAsync(request);
  } catch (err) {
    console.warn('[Notifications] scheduleNotification failed:', err);
    return null;
  }
}

/**
 * Cancel a scheduled notification safely.
 * In Expo Go: no-op — no import.
 */
export async function safeCancelNotification(id: string): Promise<void> {
  if (isExpoGo()) return;

  const Notifications = await loadModule();
  if (!Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (err) {
    console.warn('[Notifications] cancelNotification failed:', err);
  }
}

// ─── Safe schedule/cancel helpers ───────────────────────────

/**
 * Schedule a local notification safely.
 * In Expo Go: falls back to safeScheduleNotification from notificationService module.
 */
export async function safeScheduleLocal(
  params: {
    identifier?: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    channelId?: string;
    seconds?: number;
    trigger?: {
      type: number;
      hour?: number;
      minute?: number;
      repeats?: boolean;
      seconds?: number;
    };
  }
): Promise<string | null> {
  if (isExpoGo()) {
    // Expo Go fallback: schedule via native bridge (TIME_INTERVAL only)
    return safeScheduleFallback(params);
  }
  const Notifications = await loadModule();
  if (!Notifications) return safeScheduleFallback(params);

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: params.identifier,
      content: {
        title: params.title,
        body: params.body,
        data: params.data,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: params.channelId ?? 'medications' }),
      },
      trigger: params.trigger ?? {
        type: TRIGGER.TIME_INTERVAL,
        seconds: Math.max(1, params.seconds ?? 5),
        repeats: false,
      },
    });
  } catch (err) {
    console.warn('[Notifications] scheduleNotification failed:', err);
    return safeScheduleFallback(params);
  }
}

async function safeScheduleFallback(params: {
  identifier?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  seconds?: number;
}): Promise<string | null> {
  const Notifications = await loadModule();
  if (!Notifications) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: params.identifier,
      content: {
        title: params.title,
        body: params.body,
        data: params.data,
        sound: 'default',
        ...(Platform.OS === 'android' && { channelId: params.channelId ?? 'medications' }),
      },
      trigger: {
        type: TRIGGER.TIME_INTERVAL,
        seconds: Math.max(1, params.seconds ?? 5),
        repeats: false,
      },
    });
  } catch {
    return null;
  }
}

/**
 * Get all scheduled notifications.
 * In Expo Go: works natively (no push registration needed).
 */
export async function safeGetScheduledNotifications(): Promise<any[]> {
  const Notifications = await loadModule();
  if (!Notifications) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch {
    return [];
  }
}

/**
 * Cancel a scheduled notification by identifier.
 * In Expo Go: works natively.
 */
export async function safeCancelScheduledNotification(id: string): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // ignore
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function safeCancelAllNotifications(): Promise<void> {
  const Notifications = await loadModule();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

/**
 * Add a listener for received notifications.
 * In Expo Go: returns no-op cleanup.
 * NOTE: This is async because the module must be dynamically imported.
 */
export async function addNotificationReceivedListener(
  callback: (notification: unknown) => void,
): Promise<{ remove: () => void }> {
  if (isExpoGo()) return { remove: () => {} };

  const Notifications = await loadModule();
  if (!Notifications) return { remove: () => {} };

  try {
    return Notifications.addNotificationReceivedListener(callback);
  } catch {
    return { remove: () => {} };
  }
}

/**
 * Add a listener for notification response (taps).
 * In Expo Go: returns no-op cleanup.
 */
export async function addNotificationResponseReceivedListener(
  callback: (response: unknown) => void,
): Promise<{ remove: () => void }> {
  if (isExpoGo()) return { remove: () => {} };

  const Notifications = await loadModule();
  if (!Notifications) return { remove: () => {} };

  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch {
    return { remove: () => {} };
  }
}

// ─── Hardcoded enum values ───────────────────────────────────
// These are the raw values from expo-notifications enums.
// Hardcoded here so consumers never need to import the module.

/** expo-notifications AndroidNotificationPriority enum values */
export const PRIORITY = {
  MAX: 'max',
  HIGH: 'high',
  DEFAULT: 'default',
  LOW: 'low',
  MIN: 'min',
} as const;

/** expo-notifications SchedulableTriggerInputTypes enum values */
export const TRIGGER = {
  CALENDAR: 1,
  TIME_INTERVAL: 2,
  DAILY: 3,
  WEEKLY: 4,
  DATE: 5,
} as const;
