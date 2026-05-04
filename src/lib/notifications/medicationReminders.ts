import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { Medication, MedicationLog } from '../../services/medication.service';
import { parseMedicationTimes } from '../medications/medicationSchedule';
import { classifyStock } from '../medications/medicationMath';
import { notificationService } from '../../services/notification.service';
import {
  requestNotificationPermission,
  ensureAndroidChannel,
  scheduleMedicationReminder,
  cancelAllRemindersForMedication,
} from './notificationService';

type ScheduledMap = Record<string, Record<string, string>>; // medId -> timeKey -> notifId

const STORAGE_PREFIX = 'rafiq_med_reminders_v1';
const STORAGE_ALERTS_PREFIX = 'rafiq_med_alerts_v1';

function mapKey(patientId: string): string {
  return `${STORAGE_PREFIX}:${patientId}`;
}

function alertsKey(userId: string): string {
  return `${STORAGE_ALERTS_PREFIX}:${userId}`;
}

function timeKeyFor(medId: string, time: string): string {
  return `${medId}:${time}`;
}

function parseHHMM(time: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

// ─── Internal storage helpers (exported for reconciliation) ──

async function readMap(patientId: string): Promise<ScheduledMap | null> {
  const raw = await AsyncStorage.getItem(mapKey(patientId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ScheduledMap;
  } catch {
    return null;
  }
}

async function writeMap(patientId: string, map: ScheduledMap): Promise<void> {
  await AsyncStorage.setItem(mapKey(patientId), JSON.stringify(map));
}

// ─── Reconciliation ─────────────────────────────────────────

/**
 * Reconcile the AsyncStorage map against the OS scheduler.
 * Removes stored IDs for notifications that no longer exist in the OS
 * (already fired, cancelled by OS, or expired).
 *
 * Call this once on app startup (from initNotificationsOnce).
 */
export async function reconcileStoredMap(patientId: string): Promise<void> {
  const stored = await readMap(patientId);
  if (!stored) return;

  const scheduledList = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduledList.map((n) => n.identifier));

  let changed = false;
  for (const medId of Object.keys(stored)) {
    for (const key of Object.keys(stored[medId] ?? {})) {
      if (!scheduledIds.has(stored[medId][key])) {
        delete stored[medId][key];
        changed = true;
      }
    }
    if (Object.keys(stored[medId] ?? {}).length === 0) {
      delete stored[medId];
    }
  }

  if (changed) await writeMap(patientId, stored);
}

/**
 * Initialize notification handler + Android channels.
 * Called once from App.tsx on startup.
 */
export async function initNotificationsOnce(): Promise<void> {
  // Handler is set at module level in notificationService.ts,
  // but we also ensure the Android channel exists.
  await ensureAndroidChannel();
}

/**
 * Ensure permission is granted.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  return requestNotificationPermission();
}

/**
 * Sync medication reminders — call after load() or save.
 * Uses DIRECT expo-notifications (works in Expo Go).
 *
 * Key fix: verifies stored notification IDs against the OS scheduler
 * before trusting them. Stale IDs (fired or cancelled) are re-scheduled.
 */
export async function syncMedicationReminders(opts: {
  patientId: string;
  userId: string;
  language: 'ar' | 'en';
  enabled: boolean;
  medications: Medication[];
}): Promise<void> {
  const { patientId, userId, medications, enabled, language } = opts;

  // If disabled: cancel everything we previously scheduled.
  if (!enabled) {
    await cancelAllForPatient(patientId);
    return;
  }

  const allowed = await ensureNotificationPermission();
  if (!allowed) return;

  const existing = await readMap(patientId);

  // ✅ FIX B1: Fetch OS scheduler state ONCE before the loop.
  // This lets us verify that stored IDs actually exist in the OS.
  const scheduledList = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIds = new Set(scheduledList.map((n) => n.identifier));

  const nextMap: ScheduledMap = {};

  for (const med of medications) {
    const active = (med.active ?? med.is_active) !== false;
    if (!active) continue;

    const times = parseMedicationTimes(med.times, med.time_of_day).filter((t) => t.kind === 'time');
    if (times.length === 0) continue;

    for (const t of times) {
      const hhmm = parseHHMM(t.time);
      if (!hhmm) continue;
      const key = timeKeyFor(med.id, t.time);

      const existingId = existing?.[med.id]?.[key];
      if (!nextMap[med.id]) nextMap[med.id] = {};

      // ✅ FIX B1: Only skip re-scheduling if the ID actually exists in the OS.
      if (existingId && scheduledIds.has(existingId)) {
        nextMap[med.id][key] = existingId;
        continue;
      }

      // Not in OS (fired, cancelled, or never scheduled) — schedule now.
      try {
        const id = await scheduleMedicationReminder({
          medicationId: med.id,
          medicationName: med.name,
          hour: hhmm.hour,
          minute: hhmm.minute,
          language,
        });
        nextMap[med.id][key] = id;
      } catch (err) {
        console.warn('[MedReminders] Schedule failed:', med.name, t.time, err);
      }
    }
  }

  // Cancel orphaned notifications.
  await cancelOrphans(existing, nextMap);
  await writeMap(patientId, nextMap);

  // Alerts (in-app feed) — low stock + missed doses.
  await evaluateAndSendAlerts({ patientId, userId, language, medications });
}

/**
 * Sync notifications for a single medication after save/toggle.
 * Call this directly from handleSubmitForm or handleToggleActive.
 */
export async function syncSingleMedicationNotifications(medication: Medication, language: 'ar' | 'en' = 'ar'): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // Cancel existing reminders for this medication
  await cancelAllRemindersForMedication(medication.id);

  // If not active, stop here
  const isActive = (medication.active ?? medication.is_active) !== false;
  if (!isActive) return;

  // Schedule a reminder for each valid time
  const times = parseMedicationTimes(medication.times, medication.time_of_day);
  for (const t of times) {
    if (t.kind !== 'time') continue;
    const hhmm = parseHHMM(t.time);
    if (!hhmm) continue;

    try {
      await scheduleMedicationReminder({
        medicationId: medication.id,
        medicationName: medication.name,
        hour: hhmm.hour,
        minute: hhmm.minute,
        language,
      });
    } catch (err) {
      console.warn('[MedReminders] Schedule single failed:', medication.name, t.time, err);
    }
  }
}

async function cancelAllForPatient(patientId: string): Promise<void> {
  const existing = await readMap(patientId);
  if (!existing) return;
  for (const medId of Object.keys(existing)) {
    for (const notifId of Object.values(existing[medId] ?? {})) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notifId);
      } catch {
        // ignore
      }
    }
  }
  await AsyncStorage.removeItem(mapKey(patientId));
}

async function cancelOrphans(existing: ScheduledMap | null, nextMap: ScheduledMap): Promise<void> {
  if (!existing) return;
  for (const medId of Object.keys(existing)) {
    for (const [key, notifId] of Object.entries(existing[medId] ?? {})) {
      const stillNeeded = Boolean(nextMap?.[medId]?.[key]);
      if (!stillNeeded) {
        try {
          await Notifications.cancelScheduledNotificationAsync(notifId);
        } catch {
          // ignore
        }
      }
    }
  }
}

// -----------------------
// Alerts: low stock / missed dose
// -----------------------

type AlertsState = Record<string, string>; // eventKey -> isoTimestamp

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function evaluateAndSendAlerts(opts: {
  patientId: string;
  userId: string;
  language: 'ar' | 'en';
  medications: Medication[];
}): Promise<void> {
  const { userId, language, medications } = opts;
  const state = await readAlertsState(userId);
  const tk = todayKey();

  // Low stock alerts (per medication, once per day)
  for (const med of medications) {
    const active = (med.active ?? med.is_active) !== false;
    if (!active) continue;

    const stock = classifyStock({ remainingQuantity: med.remaining_quantity ?? null, refillThreshold: med.refill_threshold ?? null });
    if (stock.severity === 'safe') continue;

    const key = `low_stock:${med.id}:${tk}`;
    if (state[key]) continue;

    const title = language === 'ar' ? 'تنبيه مخزون دواء' : 'Low stock alert';
    const body =
      language === 'ar'
        ? `مخزون ${med.name} منخفض. يرجى تجهيز التعبئة قريباً.`
        : `${med.name} stock is low. Please plan a refill soon.`;

    try {
      await notificationService.createNotification({ user_id: userId, title, body, type: 'med_low_stock' });
      state[key] = new Date().toISOString();
    } catch {
      // ignore feed failures
    }
  }

  // Missed dose alert (lightweight heuristic): after 8pm
  const hourNow = new Date().getHours();
  if (hourNow >= 20) {
    for (const med of medications) {
      const active = (med.active ?? med.is_active) !== false;
      if (!active) continue;
      const times = parseMedicationTimes(med.times, med.time_of_day).filter((t) => t.kind === 'time');
      if (times.length === 0) continue;

      const key = `missed_dose_check:${med.id}:${tk}`;
      if (state[key]) continue;

      const title = language === 'ar' ? 'تحقق من جرعات اليوم' : `Check today's doses`;
      const body =
        language === 'ar'
          ? `هل تم أخذ جرعات ${med.name} اليوم؟ افتح صفحة الأدوية للتأكيد.`
          : `Did you take ${med.name} today? Open Medications to confirm.`;

      try {
        await notificationService.createNotification({ user_id: userId, title, body, type: 'med_missed_check' });
        state[key] = new Date().toISOString();
      } catch {
        // ignore
      }
    }
  }

  await writeAlertsState(userId, state);
}

async function readAlertsState(userId: string): Promise<AlertsState> {
  const raw = await AsyncStorage.getItem(alertsKey(userId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as AlertsState;
  } catch {
    return {};
  }
}

async function writeAlertsState(userId: string, state: AlertsState): Promise<void> {
  await AsyncStorage.setItem(alertsKey(userId), JSON.stringify(state));
}

// Optional helper: stronger missed-dose check when caller already has logs.
export function computeMissedDosesForToday(opts: {
  medications: Medication[];
  logsToday: MedicationLog[];
  graceMinutes?: number;
}): { missedCount: number; perMedication: Record<string, number> } {
  const grace = Math.max(15, opts.graceMinutes ?? 60);
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const logsByMed = new Map<string, MedicationLog[]>();
  for (const l of opts.logsToday) {
    const arr = logsByMed.get(l.medication_id) ?? [];
    arr.push(l);
    logsByMed.set(l.medication_id, arr);
  }

  let missedCount = 0;
  const perMedication: Record<string, number> = {};

  for (const med of opts.medications) {
    const active = (med.active ?? med.is_active) !== false;
    if (!active) continue;

    const times = parseMedicationTimes(med.times, med.time_of_day).filter((t) => t.kind === 'time');
    if (times.length === 0) continue;

    const taken = (logsByMed.get(med.id) ?? []).filter((x) => !x.skipped).map((x) => new Date(x.taken_at).getTime());
    let missedForMed = 0;

    for (const t of times) {
      const hhmm = parseHHMM(t.time);
      if (!hhmm) continue;
      const scheduled = new Date(start);
      scheduled.setHours(hhmm.hour, hhmm.minute, 0, 0);
      if (now.getTime() < scheduled.getTime() + grace * 60_000) continue; // not yet due

      const windowStart = scheduled.getTime() - 2 * 60 * 60_000;
      const windowEnd = scheduled.getTime() + 2 * 60 * 60_000;
      const hasTakenNear = taken.some((ts) => ts >= windowStart && ts <= windowEnd);
      if (!hasTakenNear) missedForMed += 1;
    }

    if (missedForMed > 0) {
      perMedication[med.id] = missedForMed;
      missedCount += missedForMed;
    }
  }

  return { missedCount, perMedication };
}
