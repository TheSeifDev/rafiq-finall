import { useEffect, useRef } from 'react';
import type { Medication } from '../services/medication.service';
import { parseHHMM, parseMedicationTimes } from '../lib/medications/medicationSchedule';
import {
  scheduleMedicationReminder,
  cancelAllRemindersForMedication,
  requestNotificationPermission,
} from '../lib/notifications/notificationService';
import { useAppStore } from '../store/app.store';

/**
 * Hook that synchronises scheduled notifications with the medications list.
 *
 * Call this once from a high-level component (e.g. MedicationsScreen).
 *
 * - For each ACTIVE medication with valid times → schedule daily reminders
 * - For each INACTIVE medication → cancel all its reminders
 * - Respects medicationReminders toggle in prefs
 * - Debounces by 500ms to avoid scheduling storms on bulk updates
 */
export function useMedicationNotifications(medications: Medication[]): void {
  const language = useAppStore((s) => s.language);
  const notifPrefs = useAppStore((s) => s.notificationPrefs);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip if notifications are disabled
    if (!notifPrefs.medicationReminders) {
      return;
    }

    // Debounce 500ms
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      syncNotifications(medications, language, notifPrefs).catch((err) =>
        console.warn('[useMedicationNotifications] Sync failed:', err),
      );
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [medications, language, notifPrefs]);
}

async function syncNotifications(
  medications: Medication[],
  language: 'ar' | 'en',
  prefs: ReturnType<typeof useAppStore.getState>['notificationPrefs'],
): Promise<void> {
  // ✅ Direct permission check (no safety wrapper)
  const granted = await requestNotificationPermission();
  if (!granted) return;

  for (const med of medications) {
    const active = (med.active ?? med.is_active) !== false;

    if (!active) {
      await cancelAllRemindersForMedication(med.id);
      continue;
    }

    const times = parseMedicationTimes(med.times, med.time_of_day).filter(
      (t) => t.kind === 'time',
    );

    if (times.length === 0) {
      await cancelAllRemindersForMedication(med.id);
      continue;
    }

    for (const t of times) {
      const hhmm = parseHHMM(t.time);
      if (!hhmm) continue;

      await scheduleMedicationReminder({
        medicationId: med.id,
        medicationName: med.name,
        hour: hhmm.hour,
        minute: hhmm.minute,
        language,
        prefs,
      });
    }
  }
}
