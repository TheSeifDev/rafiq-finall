/**
 * Vitals Analytics — real data only.
 *
 * ALL fake / random / seeded data generation has been removed.
 * generateRealisticWeek() does NOT exist any more.
 * Charts are driven exclusively by real Health Connect records.
 */

// ─── Types ──────────────────────────────────────────────────

export interface DayVitals {
  day: string;
  hr: number;
  sys: number;
  dia: number;
  spo2: number;
  temp: number;
}

export interface VitalStats {
  avg: number;
  min: number;
  max: number;
}

export interface WeeklyAnalytics {
  days: DayVitals[];
  hr: VitalStats;
  sys: VitalStats;
  spo2: VitalStats;
}

// ─── Helpers ─────────────────────────────────────────────────

function stats(arr: number[]): VitalStats {
  const clean = arr.filter((v) => v > 0);
  if (!clean.length) return { avg: 0, min: 0, max: 0 };
  const sum = clean.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / clean.length),
    min: Math.min(...clean),
    max: Math.max(...clean),
  };
}

// ─── Real records → DayVitals ─────────────────────────────────

/**
 * Convert VitalsRecord[] (from SQLite/Health Connect) into DayVitals[]
 * for chart rendering. Only real records are passed; no fallback data.
 */
export function recordsToDays(
  records: Array<{
    recorded_at: string;
    heart_rate: number | null;
    blood_pressure_systolic: number | null;
    blood_pressure_diastolic: number | null;
    oxygen_saturation: number | null;
    temperature: number | null;
  }>,
  isAr = false,
): DayVitals[] {
  const last7 = records.slice(0, 7).reverse();
  return last7.map((r) => {
    const d = new Date(r.recorded_at);
    const dayName = isAr
      ? d.toLocaleDateString('ar-EG', { weekday: 'short' })
      : d.toLocaleDateString('en-US', { weekday: 'short' });
    return {
      day: dayName,
      hr: r.heart_rate ?? 0,
      sys: r.blood_pressure_systolic ?? 0,
      dia: r.blood_pressure_diastolic ?? 0,
      spo2: r.oxygen_saturation ?? 0,
      temp: r.temperature ?? 0,
    };
  });
}

// ─── Build analytics from real records ───────────────────────

export function buildWeeklyAnalytics(days: DayVitals[]): WeeklyAnalytics {
  return {
    days,
    hr: stats(days.map((d) => d.hr)),
    sys: stats(days.map((d) => d.sys)),
    spo2: stats(days.map((d) => d.spo2)),
  };
}

/** Empty analytics object — shown when no records available. */
export const EMPTY_ANALYTICS: WeeklyAnalytics = {
  days: [],
  hr: { avg: 0, min: 0, max: 0 },
  sys: { avg: 0, min: 0, max: 0 },
  spo2: { avg: 0, min: 0, max: 0 },
};
