/**
 * Vitals Analytics — realistic data generation + stats computation.
 *
 * Priority pipeline: real DB records → live BLE reading → persona fallback.
 * All fallback data uses physiologically coherent patterns.
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

// ─── Physiological model ────────────────────────────────────
// A circadian-like pattern: HR rises mid-week (stress/activity)
// and dips on weekends. BP correlates with HR.

const CIRCADIAN_HR = [0, 1.5, 3.2, 4.0, 2.8, 1.0, -0.5]; // Mon-Sun bias

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function smooth(arr: number[], passes = 1): number[] {
  let r = [...arr];
  for (let p = 0; p < passes; p++) {
    const next = [...r];
    for (let i = 1; i < r.length - 1; i++) {
      next[i] = r[i - 1] * 0.25 + r[i] * 0.5 + r[i + 1] * 0.25;
    }
    r = next;
  }
  return r.map((v) => Math.round(v * 10) / 10);
}

function stats(arr: number[]): VitalStats {
  if (!arr.length) return { avg: 0, min: 0, max: 0 };
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / arr.length),
    min: Math.min(...arr),
    max: Math.max(...arr),
  };
}

// ─── Realistic 7-day generator ──────────────────────────────

export function generateRealisticWeek(
  baseHR = 74,
  baseSys = 120,
  baseDia = 78,
  daysAr?: boolean,
): DayVitals[] {
  const labels = daysAr
    ? ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع']
    : ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  // Raw values with circadian bias + natural noise
  const rawHR = labels.map((_, i) => {
    const bias = CIRCADIAN_HR[i];
    const noise = (Math.random() - 0.5) * 6; // ±3 bpm
    return clamp(Math.round(baseHR + bias + noise), 58, 100);
  });

  // BP correlates with HR
  const rawSys = rawHR.map((hr) => {
    const delta = hr - baseHR;
    const noise = (Math.random() - 0.5) * 6;
    return clamp(Math.round(baseSys + delta * 0.7 + noise), 100, 145);
  });

  const rawDia = rawSys.map((sys) =>
    clamp(Math.round(sys * 0.64 + (Math.random() - 0.5) * 4), 60, 95),
  );

  // SpO2 is very stable (healthy adult)
  const rawSpo2 = labels.map(() =>
    clamp(Math.round(97.5 + (Math.random() - 0.5) * 3), 95, 100),
  );

  // Temperature small variance
  const rawTemp = labels.map(() =>
    parseFloat((36.5 + (Math.random() - 0.5) * 0.8).toFixed(1)),
  );

  // Smooth HR and BP to avoid unrealistic jumps
  const hr = smooth(rawHR).map(Math.round);
  const sys = smooth(rawSys).map(Math.round);

  return labels.map((day, i) => ({
    day,
    hr: hr[i],
    sys: sys[i],
    dia: rawDia[i],
    spo2: rawSpo2[i],
    temp: rawTemp[i],
  }));
}

// ─── Build analytics from any source ────────────────────────

export function buildWeeklyAnalytics(
  days: DayVitals[],
): WeeklyAnalytics {
  return {
    days,
    hr: stats(days.map((d) => d.hr)),
    sys: stats(days.map((d) => d.sys)),
    spo2: stats(days.map((d) => d.spo2)),
  };
}

/**
 * Convert VitalsRecord[] (from DB) into DayVitals[] for the chart.
 * Takes the last 7 records and maps them.
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
