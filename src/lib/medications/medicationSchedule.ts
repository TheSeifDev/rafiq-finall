export type ParsedDoseTime =
  | { kind: 'time'; time: string; mealRule?: string | null }
  | { kind: 'label'; label: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeTime(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  // Accept HH:mm, H:mm, and "08:00 AM" (kept as-is for display only)
  if (/^\d{1,2}:\d{2}$/.test(v)) {
    const [hRaw, mRaw] = v.split(':');
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(v)) return v;
  return null;
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

