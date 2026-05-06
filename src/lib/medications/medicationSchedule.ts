export type ParsedDoseTime =
  | { kind: 'time'; time: string; mealRule?: string | null }
  | { kind: 'label'; label: string };

export type ParsedClockTime = {
  hour: number;
  minute: number;
  period?: 'AM' | 'PM';
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseClockTime(value: string): ParsedClockTime | null {
  const v = value.trim().replace(/\s+/g, ' ');
  if (!v) return null;

  const twelveHour = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v);
  if (twelveHour) {
    const rawHour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    const period = twelveHour[3].toUpperCase() as 'AM' | 'PM';
    if (!Number.isFinite(rawHour) || !Number.isFinite(minute)) return null;
    if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) return null;
    const hour = period === 'AM'
      ? rawHour === 12 ? 0 : rawHour
      : rawHour === 12 ? 12 : rawHour + 12;
    return { hour, minute, period };
  }

  const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  }

  return null;
}

export function normalizeTime(value: string): string | null {
  const parsed = parseClockTime(value);
  if (!parsed) return null;
  return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
}

export function formatMedicationTime(value: string, opts?: { use12Hour?: boolean }): string {
  const parsed = parseClockTime(value);
  if (!parsed) return value.trim();

  if (opts?.use12Hour === false) {
    return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
  }

  const period = parsed.hour >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return `${hour12}:${String(parsed.minute).padStart(2, '0')} ${period}`;
}

export function parseHHMM(time: string): { hour: number; minute: number } | null {
  const normalized = normalizeTime(time);
  if (!normalized) return null;
  const [hourRaw, minuteRaw] = normalized.split(':');
  return { hour: Number(hourRaw), minute: Number(minuteRaw) };
}

export function parseMedicationTimes(times: unknown, fallbackTimeOfDay?: string[] | null): ParsedDoseTime[] {
  const out: ParsedDoseTime[] = [];

  if (Array.isArray(times)) {
    for (const t of times) {
      if (typeof t === 'string') {
        const nt = normalizeTime(t);
        if (nt) out.push({ kind: 'time', time: nt });
        continue;
      }
      if (isObject(t)) {
        const rawTime = typeof t.time === 'string' ? t.time : typeof t.at === 'string' ? t.at : '';
        const nt = normalizeTime(rawTime);
        if (!nt) continue;
        const mealRule = typeof t.meal_rule === 'string' ? t.meal_rule : typeof t.mealRule === 'string' ? t.mealRule : null;
        out.push({ kind: 'time', time: nt, mealRule });
      }
    }
  }

  if (out.length > 0) return out;

  const fb = Array.isArray(fallbackTimeOfDay) ? fallbackTimeOfDay : [];
  for (const label of fb) {
    if (typeof label === 'string' && label.trim()) out.push({ kind: 'label', label: label.trim() });
  }
  return out;
}

export function estimateDosesPerDay(opts: {
  scheduleType?: string | null;
  times?: unknown;
  timeOfDay?: string[] | null;
  frequencyText?: string | null;
}): number {
  const parsedTimes = parseMedicationTimes(opts.times, opts.timeOfDay);
  const timeCount = parsedTimes.filter((t) => t.kind === 'time').length;
  if (timeCount > 0) return timeCount;

  const scheduleType = (opts.scheduleType ?? '').trim().toLowerCase();
  if (scheduleType === 'once_daily') return 1;
  if (scheduleType === 'twice_daily') return 2;
  if (scheduleType === 'three_times_daily') return 3;

  const freq = (opts.frequencyText ?? '').trim().toLowerCase();
  if (freq.includes('twice')) return 2;
  if (freq.includes('3') || freq.includes('three')) return 3;
  if (freq.includes('once') || freq.includes('daily')) return 1;

  // Fallback: time_of_day labels count (morning/evening/...)
  const labels = parsedTimes.filter((t) => t.kind === 'label').length;
  return Math.max(1, labels);
}
