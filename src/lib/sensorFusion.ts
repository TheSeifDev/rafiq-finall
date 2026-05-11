/**
 * Sensor Fusion Engine — Cross-Sensor Validation + Composite Confidence
 *
 * Architecture:
 *   Multiple readings → SensorFusion.fuse() → ValidatedReading + AnomalyFlags
 *
 * Features:
 *   - Cross-sensor validation (HR vs SpO2 consistency)
 *   - Temporal consistency (reading-to-reading drift)
 *   - Trend stability analysis (smoothed vs raw)
 *   - Composite medical confidence (sensor + temporal + fusion + trend)
 *   - Anomaly flags (motion, implausible, conflict, stale)
 */
import type { VitalsReading } from '../services/wearable/ble.types';
import { computeConfidenceScore, type ConfidenceScore, type VitalReadingWithMeta } from './healthEngine';

// ─── Types ─────────────────────────────────────────────────────────────────

export type FusionConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export interface AnomalyFlag {
  type: 'motion' | 'implausible' | 'sensor_conflict' | 'stale' | 'trend_anomaly';
  severity: 'low' | 'medium' | 'high';
  message: string;
  affectedVital?: string;
}

export interface FusionResult {
  /** Primary validated reading */
  reading: VitalReadingWithMeta;
  /** Composite confidence (0-100) */
  confidence: number;
  level: FusionConfidenceLevel;
  /** Per-component scores */
  components: {
    sensor: number;
    temporal: number;
    fusion: number;
    trend: number;
  };
  /** Anomaly flags found during fusion */
  anomalies: AnomalyFlag[];
  /** Whether the reading passed all fusion checks */
  isValid: boolean;
  /** Human-readable summary */
  summary: string;
}

export interface TrendAnalysis {
  /** Current value */
  current: number | null;
  /** Rolling average over window */
  rollingAvg: number | null;
  /** Standard deviation in window */
  stdDev: number | null;
  /** Rate of change per minute (linear regression slope) */
  slope: number | null;
  /** Stability score (0-100, higher = more stable) */
  stability: number;
  /** Trend direction */
  direction: 'rising' | 'falling' | 'stable' | 'unknown';
  /** Confidence in trend direction */
  trendConfidence: number;
}

interface ReadingWindowEntry {
  reading: VitalsReading;
  timestamp: number;
}

// ─── Rolling window for temporal analysis ─────────────────────────────────

const vitalWindows = new Map<string, ReadingWindowEntry[]>();
const MAX_WINDOW_SIZE = 10;

function pushToWindow(vitalKey: string, reading: VitalsReading, timestamp: number): void {
  const window = vitalWindows.get(vitalKey) ?? [];
  window.push({ reading, timestamp });
  if (window.length > MAX_WINDOW_SIZE) window.shift();
  vitalWindows.set(vitalKey, window);
}

function getWindow(vitalKey: string): ReadingWindowEntry[] {
  return vitalWindows.get(vitalKey) ?? [];
}

// ─── Cross-sensor validation rules ───────────────────────────────────────

function validateCrossSensor(reading: VitalsReading): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  // Rule: HR and SpO2 must be physiologically consistent
  if (reading.heart_rate != null && reading.oxygen_saturation != null) {
    const hr = reading.heart_rate;
    const spo2 = reading.oxygen_saturation;

    // High HR with very high SpO2 — unusual but possible (athlete)
    if (hr > 140 && spo2 > 98) {
      flags.push({
        type: 'sensor_conflict',
        severity: 'medium',
        message: `High HR (${hr}) with saturated SpO2 (${spo2}%) — possible sensor conflict`,
        affectedVital: 'heart_rate',
      });
    }

    // Very low HR with very high SpO2 — needs verification
    if (hr < 45 && spo2 > 97) {
      flags.push({
        type: 'sensor_conflict',
        severity: 'medium',
        message: `Low HR (${hr}) with high SpO2 (${spo2}%) — verify bradycardia`,
        affectedVital: 'heart_rate',
      });
    }
  }

  // Rule: BP systolic must be > diastolic
  if (reading.blood_pressure_systolic != null && reading.blood_pressure_diastolic != null) {
    if (reading.blood_pressure_systolic <= reading.blood_pressure_diastolic) {
      flags.push({
        type: 'implausible',
        severity: 'high',
        message: 'Systolic BP must be greater than diastolic',
        affectedVital: 'blood_pressure',
      });
    }
    if (reading.blood_pressure_systolic - reading.blood_pressure_diastolic < 20) {
      flags.push({
        type: 'implausible',
        severity: 'medium',
        message: 'Pulse pressure unusually narrow (< 20 mmHg)',
        affectedVital: 'blood_pressure',
      });
    }
  }

  // Rule: SpO2 must be <= 100
  if (reading.oxygen_saturation != null && reading.oxygen_saturation > 100) {
    flags.push({
      type: 'implausible',
      severity: 'high',
      message: 'SpO2 cannot exceed 100%',
      affectedVital: 'oxygen_saturation',
    });
  }

  return flags;
}

// ─── Temporal consistency ─────────────────────────────────────────────────

function checkTemporalConsistency(vitalKey: string, current: VitalsReading, threshold?: number): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  const window = getWindow(vitalKey);
  if (window.length < 2) return flags;

  const prev = window[window.length - 2].reading;
  const getVal = (r: VitalsReading, k: string): number | null =>
    (r as Record<string, number | null>)[k] ?? null;

  for (const vital of ['heart_rate', 'oxygen_saturation'] as const) {
    const currVal = getVal(current, vital);
    const prevVal = getVal(prev, vital);
    if (currVal == null || prevVal == null) continue;

    const delta = Math.abs(currVal - prevVal);
    const maxDelta = threshold ?? (vital === 'heart_rate' ? 30 : 5);

    if (delta > maxDelta) {
      flags.push({
        type: 'stale',
        severity: 'medium',
        message: `Sudden ${vital} change of ${delta} — verify device connection`,
        affectedVital: vital,
      });
    }
  }

  return flags;
}

// ─── Trend stability analysis ───────────────────────────────────────────────

export function analyzeTrend(vitalKey: string, windowSize = 5): TrendAnalysis {
  const window = getWindow(vitalKey).slice(-windowSize);
  if (window.length < 2) {
    return {
      current: null, rollingAvg: null, stdDev: null, slope: null,
      stability: 0, direction: 'unknown', trendConfidence: 0,
    };
  }

  const getVal = (r: VitalsReading, k: string): number | null =>
    (r as Record<string, number | null>)[k] ?? null;

  // Infer the vital from the key suffix
  const vital = vitalKey.replace('_window', '') as keyof VitalsReading;
  const values = window.map(e => getVal(e.reading, vital)).filter((v): v is number => v != null);

  if (values.length < 2) {
    return {
      current: values[0] ?? null, rollingAvg: null, stdDev: null, slope: null,
      stability: 0, direction: 'unknown', trendConfidence: 0,
    };
  }

  const current = values[values.length - 1];
  const rollingAvg = values.reduce((a, b) => a + b, 0) / values.length;
  const mean = rollingAvg;

  // Standard deviation
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Linear regression for slope
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;

  // Stability: 100 - (stdDev/mean * 100), clamped to [0, 100]
  const cv = stdDev / mean;
  const stability = Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));

  // Direction based on slope sign
  const slopeThreshold = stdDev * 0.1;
  let direction: TrendAnalysis['direction'];
  let trendConfidence: number;
  if (Math.abs(slope) < slopeThreshold) {
    direction = 'stable';
    trendConfidence = Math.min(100, Math.round((1 - Math.abs(slope) / (slopeThreshold || 1)) * 100));
  } else if (slope > 0) {
    direction = 'rising';
    trendConfidence = Math.min(100, Math.round(Math.abs(slope) / (stdDev || 1) * 50));
  } else {
    direction = 'falling';
    trendConfidence = Math.min(100, Math.round(Math.abs(slope) / (stdDev || 1) * 50));
  }

  return { current, rollingAvg: Math.round(rollingAvg * 10) / 10, stdDev: Math.round(stdDev * 100) / 100, slope: Math.round(slope * 1000) / 1000, stability, direction, trendConfidence };
}

// ─── Main fusion function ──────────────────────────────────────────────────

export function fuseReading(
  reading: VitalsReading,
  options?: {
    includeAnomalies?: boolean;
    checkTrendStability?: boolean;
    windowSize?: number;
  }
): FusionResult {
  const { includeAnomalies = true, checkTrendStability = true, windowSize = 5 } = options ?? {};

  // Record timestamp
  const timestamp = reading.timestamp ?? Date.now();

  // Push readings to windows (for trend analysis)
  const vitalsToTrack = ['heart_rate', 'oxygen_saturation'] as const;
  for (const vital of vitalsToTrack) {
    const val = (reading as Record<string, number | null>)[vital];
    if (val != null) {
      pushToWindow(vital, reading, timestamp);
    }
  }

  // Start with base confidence from healthEngine
  const withMeta = reading as VitalReadingWithMeta;
  const baseConfidence = computeConfidenceScore(withMeta);

  let fusionScore = 100;
  let trendScore = 100;
  const anomalies: AnomalyFlag[] = [...baseConfidence.reasons.map(r => ({
    type: 'stale' as const,
    severity: 'low' as const,
    message: r,
  }))];

  // ── Cross-sensor validation ──
  if (includeAnomalies) {
    anomalies.push(...validateCrossSensor(reading));
    for (const vital of vitalsToTrack) {
      anomalies.push(...checkTemporalConsistency(vital, reading));
    }
  }

  // High severity anomalies reduce fusion confidence significantly
  const highSeverity = anomalies.filter(a => a.severity === 'high').length;
  const mediumSeverity = anomalies.filter(a => a.severity === 'medium').length;
  fusionScore -= highSeverity * 25;
  fusionScore -= mediumSeverity * 10;

  // ── Trend stability ──
  if (checkTrendStability) {
    for (const vital of vitalsToTrack) {
      const trend = analyzeTrend(vital, windowSize);
      if (trend.stability > 0) {
        trendScore = Math.min(trendScore, trend.stability);
      }
      // Flag trend anomalies
      if (trend.direction !== 'unknown' && trend.trendConfidence < 40 && trend.stability < 50) {
        anomalies.push({
          type: 'trend_anomaly',
          severity: 'medium',
          message: `Unstable ${vital} trend (${trend.direction}) — requires verification`,
          affectedVital: vital,
        });
      }
    }
  }

  // ── Composite confidence ──
  const confidence = Math.round(
    baseConfidence.overall * 0.30 +
    fusionScore * 0.30 +
    trendScore * 0.25 +
    (baseConfidence.isStale ? 0 : 15)
  );

  const level: FusionConfidenceLevel =
    confidence >= 80 ? 'high' :
    confidence >= 50 ? 'medium' :
    confidence >= 20 ? 'low' : 'unknown';

  // ── Validity check ──
  const isValid =
    level !== 'unknown' &&
    !anomalies.some(a => a.severity === 'high') &&
    baseConfidence.overall > 0;

  // ── Summary ──
  const anomalySummary = anomalies.length > 0
    ? `Fusion: ${anomalies.length} anomaly(ies) detected`
    : 'Fusion: All checks passed';

  const summary = [
    `Confidence: ${confidence}% (${level})`,
    anomalySummary,
    baseConfidence.isStale ? 'Data is stale' : 'Data is fresh',
    checkTrendStability ? `Trend stability: ${trendScore}%` : '',
  ].filter(Boolean).join(' | ');

  return {
    reading: withMeta,
    confidence,
    level,
    components: {
      sensor: baseConfidence.overall,
      temporal: baseConfidence.temporalFreshness,
      fusion: Math.max(0, fusionScore),
      trend: Math.max(0, trendScore),
    },
    anomalies,
    isValid,
    summary,
  };
}

// ─── Quick convenience ────────────────────────────────────────────────────

export function quickFusion(reading: VitalsReading): { confidence: number; isValid: boolean } {
  const result = fuseReading(reading);
  return { confidence: result.confidence, isValid: result.isValid };
}

export function clearFusionWindows(): void {
  vitalWindows.clear();
}
