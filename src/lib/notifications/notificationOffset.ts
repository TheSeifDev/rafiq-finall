/**
 * Notification Time Offset Utility
 * Handles scheduling offset for medication notifications
 * to account for push notification delivery delays
 *
 * Usage:
 * - display_time: Time shown to user in UI
 * - trigger_time: Actual time to send notification (display_time - 3 minutes)
 */

const DEFAULT_OFFSET_MINUTES = 3;

/**
 * Apply offset to a scheduled time
 * Returns an object with both display and trigger times
 */
export function applyNotificationOffset(
  scheduledTime: Date,
  offsetMinutes: number = DEFAULT_OFFSET_MINUTES
): {
  displayTime: Date;
  triggerTime: Date;
  displayTimeISO: string;
  triggerTimeISO: string;
} {
  const displayTime = new Date(scheduledTime);
  const triggerTime = new Date(scheduledTime.getTime() - offsetMinutes * 60 * 1000);

  return {
    displayTime,
    triggerTime,
    displayTimeISO: displayTime.toISOString(),
    triggerTimeISO: triggerTime.toISOString(),
  };
}

/**
 * Calculate offset time from HH:MM string
 * Returns both display and trigger times
 */
export function offsetTimeFromHHMM(
  timeHHMM: string,
  offsetMinutes: number = DEFAULT_OFFSET_MINUTES
): {
  displayHour: number;
  displayMinute: number;
  triggerHour: number;
  triggerMinute: number;
  displayTimeHHMM: string;
  triggerTimeHHMM: string;
} {
  const [hoursStr, minutesStr] = timeHHMM.split(":");
  let displayHour = parseInt(hoursStr || "0", 10);
  const displayMinute = parseInt(minutesStr || "0", 10);

  // Calculate trigger time by subtracting offset
  let triggerMinute = displayMinute - offsetMinutes;
  let triggerHour = displayHour;

  if (triggerMinute < 0) {
    triggerMinute += 60;
    triggerHour -= 1;
    if (triggerHour < 0) {
      triggerHour = 23;
    }
  }

  // Handle next day wrap
  if (triggerHour < 0) {
    triggerHour = 23;
  }

  const displayTimeHHMM = `${String(displayHour).padStart(2, "0")}:${String(displayMinute).padStart(2, "0")}`;
  const triggerTimeHHMM = `${String(triggerHour).padStart(2, "0")}:${String(triggerMinute).padStart(2, "0")}`;

  return {
    displayHour,
    displayMinute,
    triggerHour,
    triggerMinute,
    displayTimeHHMM,
    triggerTimeHHMM,
  };
}

/**
 * Format offset info for display/debugging
 */
export function formatOffsetInfo(
  displayTime: string,
  offsetMinutes: number = DEFAULT_OFFSET_MINUTES
): string {
  const display = new Date(displayTime);
  const trigger = new Date(display.getTime() - offsetMinutes * 60 * 1000);

  return `Display: ${display.toLocaleTimeString()} → Trigger: ${trigger.toLocaleTimeString()} (${offsetMinutes}min early)`;
}

/**
 * Get offset in milliseconds
 */
export function getOffsetMs(offsetMinutes: number = DEFAULT_OFFSET_MINUTES): number {
  return offsetMinutes * 60 * 1000;
}

/**
 * Check if offset would push to previous day
 */
export function wouldCrossDayBoundary(
  timeHHMM: string,
  offsetMinutes: number = DEFAULT_OFFSET_MINUTES
): boolean {
  const [hoursStr, minutesStr] = timeHHMM.split(":");
  const minutes = parseInt(minutesStr || "0", 10);
  return minutes < offsetMinutes;
}

// For timezone-safe scheduling
export function getUTCEquivalent(localDate: Date): number {
  return localDate.getTime() - localDate.getTimezoneOffset() * 60 * 1000;
}

export function fromUTCToLocal(utcTimestamp: number): Date {
  return new Date(utcTimestamp + new Date().getTimezoneOffset() * 60 * 1000);
}