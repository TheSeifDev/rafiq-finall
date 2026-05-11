/**
 * Dev Simulator — Only for development/testing
 *
 * All mock data is centralized here.
 * This module should NEVER be imported in production builds.
 *
 * Usage:
 *   import { simulator } from '../dev/simulator';
 *   // Only in development branches or when no device is connected
 *
 * NEVER import this from production UI components.
 */
import type { VitalsReading } from '../services/wearable/ble.types';

export type SimulatorPersona = 'athlete' | 'sedentary' | 'elderly' | 'hypertensive' | 'diabetic';

const PERSONAS: Record<SimulatorPersona, {
  baseHR: [number, number];
  baseSPO2: [number, number];
  baseSys: [number, number];
  baseDia: [number, number];
  baseTemp: [number, number];
  baseSteps: [number, number];
  sleepRange: [number, number];
}> = {
  athlete: {
    baseHR: [52, 62],
    baseSPO2: [98, 100],
    baseSys: [108, 118],
    baseDia: [65, 75],
    baseTemp: [36.3, 36.7],
    baseSteps: [8000, 15000],
    sleepRange: [7, 9],
  },
  sedentary: {
    baseHR: [72, 82],
    baseSPO2: [95, 98],
    baseSys: [118, 128],
    baseDia: [75, 82],
    baseTemp: [36.5, 37.0],
    baseSteps: [2000, 6000],
    sleepRange: [5, 8],
  },
  elderly: {
    baseHR: [68, 78],
    baseSPO2: [93, 97],
    baseSys: [125, 140],
    baseDia: [75, 88],
    baseTemp: [36.2, 36.8],
    baseSteps: [3000, 8000],
    sleepRange: [6, 8],
  },
  hypertensive: {
    baseHR: [70, 80],
    baseSPO2: [95, 98],
    baseSys: [140, 160],
    baseDia: [88, 100],
    baseTemp: [36.5, 37.0],
    baseSteps: [4000, 7000],
    sleepRange: [5, 7],
  },
  diabetic: {
    baseHR: [74, 84],
    baseSPO2: [94, 98],
    baseSys: [120, 135],
    baseDia: [78, 86],
    baseTemp: [36.8, 37.5],
    baseSteps: [4000, 8000],
    sleepRange: [5, 7],
  },
};

function randInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function roundTo(n: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

// ─── Vitals generation ─────────────────────────────────────────

export function generateVitals(persona: SimulatorPersona = 'sedentary', timestamp?: number): VitalsReading {
  const p = PERSONAS[persona];

  const hr = Math.round(randInRange(p.baseHR[0], p.baseHR[1]) + (Math.random() - 0.5) * 8);
  const spo2 = Math.round(randInRange(p.baseSPO2[0], p.baseSPO2[1]) + (Math.random() - 0.5) * 2);
  const sys = Math.round(randInRange(p.baseSys[0], p.baseSys[1]) + (Math.random() - 0.5) * 6);
  const dia = Math.round(randInRange(p.baseDia[0], p.baseDia[1]) + (Math.random() - 0.5) * 4);
  const temp = roundTo(randInRange(p.baseTemp[0], p.baseTemp[1]) + (Math.random() - 0.5) * 0.2, 1);
  const steps = Math.round(randInRange(p.baseSteps[0], p.baseSteps[1]) + (Math.random() - 0.5) * 500);
  const sleep = roundTo(randInRange(p.sleepRange[0], p.sleepRange[1]) + (Math.random() - 0.5) * 1, 1);

  return {
    heart_rate: Math.max(45, Math.min(180, hr)),
    oxygen_saturation: Math.max(88, Math.min(100, spo2)),
    blood_pressure_systolic: Math.max(90, Math.min(180, sys)),
    blood_pressure_diastolic: Math.max(55, Math.min(110, dia)),
    temperature: Math.max(35.0, Math.min(39.5, temp)),
    steps: Math.max(0, steps),
    sleep_hours: Math.max(0, Math.min(12, sleep)),
    timestamp: timestamp ?? Date.now(),
  };
}

export function generateHistory(days: number, persona: SimulatorPersona = 'sedentary'): VitalsReading[] {
  const readings: VitalsReading[] = [];
  for (let i = days - 1; i >= 0; i--) {
    readings.push(generateVitals(persona, Date.now() - i * 24 * 60 * 60 * 1000));
  }
  return readings;
}

// ─── Trend generation for weekly charts ───────────────────────

export interface WeeklyTrend {
  day: string;
  dayShort: string;
  dayIndex: number;
  hr: number;
  spo2: number;
  sleep: number;
  steps: number;
  bpSys: number;
  bpDia: number;
  temp: number;
  stressLevel: number;
}

export function generateWeeklyTrends(persona: SimulatorPersona = 'sedentary', isAr = false): WeeklyTrend[] {
  const dayNames = isAr
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const p = PERSONAS[persona];
  const trends: WeeklyTrend[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);

    const dayVariance = (Math.random() - 0.5) * 6;
    const weekWave = Math.sin(i * 0.5) * 4;

    trends.push({
      day: d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      }),
      dayShort: dayNames[d.getDay()],
      dayIndex: d.getDay(),
      hr: Math.round(Math.max(48, Math.min(100, p.baseHR[0] + weekWave + dayVariance))),
      spo2: Math.round(Math.max(93, Math.min(100, (p.baseSPO2[0] + p.baseSPO2[1]) / 2 + (Math.random() - 0.5) * 2))),
      sleep: roundTo(Math.max(4, Math.min(10, (p.sleepRange[0] + p.sleepRange[1]) / 2 + (Math.random() - 0.5) * 1.5)), 1),
      steps: Math.round(Math.max(1500, Math.min(15000, (p.baseSteps[0] + p.baseSteps[1]) / 2 + dayVariance * 200))),
      bpSys: Math.round(Math.max(100, Math.min(165, (p.baseSys[0] + p.baseSys[1]) / 2 + dayVariance * 1.5))),
      bpDia: Math.round(Math.max(60, Math.min(105, (p.baseDia[0] + p.baseDia[1]) / 2 + dayVariance))),
      temp: roundTo(Math.max(35.8, Math.min(37.5, (p.baseTemp[0] + p.baseTemp[1]) / 2 + (Math.random() - 0.5) * 0.3)), 1),
      stressLevel: Math.round(Math.max(10, Math.min(90, 40 + (Math.random() - 0.5) * 30))),
    });
  }

  return trends;
}

// ─── Singleton simulator instance ────────────────────────────

let currentPersona: SimulatorPersona = 'sedentary';

export const simulator = {
  setPersona(persona: SimulatorPersona) {
    currentPersona = persona;
  },
  getPersona(): SimulatorPersona {
    return currentPersona;
  },
  generate(): VitalsReading {
    return generateVitals(currentPersona);
  },
  generateHistory,
  generateWeeklyTrends,
};