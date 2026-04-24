import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Medication, MedicationLog } from '../../services/medication.service';
import { parseMedicationTimes } from '../medications/medicationSchedule';
import { classifyStock } from '../medications/medicationMath';
import { notificationService } from '../../services/notification.service';
import {
  safeInitNotifications,
  safeRequestPermissions,
  safeScheduleNotification,
  safeCancelNotification,
  PRIORITY,
  TRIGGER,
} from './notificationSafety';

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

export async function initNotificationsOnce(): Promise<void> {
  await safeInitNotifications();
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const result = await safeRequestPermissions();
  return result.granted;
}

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
  const nextMap: ScheduledMap = {};

  for (const med of medications) {
    const active = (med.active ?? med.is_active) !== false;
    if (!active) continue;

    const times = parseMedicationTimes(med.times, med.time_of_day).filter((t) => t.kind === 'time');
    if (times.length === 0) continue;

    for (const t of times) {
      const hhmm = parseHHMM(t.time);
      if (!hhmm) continue; // don't schedule AM/PM strings as repeating triggers
      const key = timeKeyFor(med.id, t.time);

      const existingId = existing?.[med.id]?.[key];
      if (!nextMap[med.id]) nextMap[med.id] = {};

      if (existingId) {
        nextMap[med.id][key] = existingId;
        continue;
      }

      const title = language === 'ar' ? 'تذكير دواء' : 'Medication reminder';
      const body =
        language === 'ar'
          ? `حان وقت جرعة: ${med.name}${med.strength ? ` (${med.strength})` : ''}`
          : `Time for dose: ${med.name}${med.strength ? ` (${med.strength})` : ''}`;

      const id = await safeScheduleNotification({
        content: {
          title,
          body,
          sound: true,
          priority: PRIORITY.MAX,
          ...(Platform.OS === 'android' ? { channelId: 'medications' } : null),
          data: { kind: 'medication_reminder', medicationId: med.id, patientId },
        },
        trigger: { type: TRIGGER.CALENDAR, hour: hhmm.hour, minute: hhmm.minute, repeats: true },
      });

      if (id) nextMap[med.id][key] = id;
    }
  }

  // Cancel orphaned notifications.
  await cancelOrphans(existing, nextMap);
  await writeMap(patientId, nextMap);

  // Alerts (in-app feed) — low stock + missed doses.
  await evaluateAndSendAlerts({ patientId, userId, language, medications });
}

async function cancelAllForPatient(patientId: string): Promise<void> {
  const existing = await readMap(patientId);
  if (!existing) return;
  for (const medId of Object.keys(existing)) {
    for (const notifId of Object.values(existing[medId] ?? {})) {
      try {
        await safeCancelNotification(notifId);
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
          await safeCancelNotification(notifId);
        } catch {
          // ignore
        }
      }
    }
  }
}

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

  // Missed dose alert (lightweight heuristic): after 8pm, if a med has times and no taken log today -> alert once/day.
  const hourNow = new Date().getHours();
  if (hourNow >= 20) {
    // We don't have patient-scoped logs here without another query; rely on heuristic: only alert if remaining exists + has schedule.
    // Full missed-dose logic with logs is invoked from MedicationsScreen (more context).
    for (const med of medications) {
      const active = (med.active ?? med.is_active) !== false;
      if (!active) continue;
      const times = parseMedicationTimes(med.times, med.time_of_day).filter((t) => t.kind === 'time');
      if (times.length === 0) continue;

      const key = `missed_dose_check:${med.id}:${tk}`;
      if (state[key]) continue;

      const title = language === 'ar' ? 'تحقق من جرعات اليوم' : 'Check today’s doses';
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

