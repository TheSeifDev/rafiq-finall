/**
 * Health Data Mapper — Provider-specific data transformations
 */

import type { WearableProvider, WearableVitals } from '../../types/wearable';

interface AppleHealthData {
  date: string;
  heart_rate?: number;
  resting_heart_rate?: number;
  oxygen_saturation?: number;
  step_count?: number;
  sleep_analysis?: Array<{ start: string; end: string; value: string }>;
  active_energy?: number;
}

interface HealthConnectData {
  instant: string;
  heart_rate?: { value: number };
  blood_pressure?: { systolic: { value: number }; diastolic: { value: number } };
  oxygen_saturation?: { value: number };
  body_temperature?: { value: number };
  steps?: { count: number };
  sleep_session?: { start_time: string; end_time: string; stages: Array<{ stage: string; duration_seconds: number }> };
  active_calories?: { energy: { value: number } };
}

interface GarminData {
  summaryDate: string;
  heartRates?: { restingHeartRate: number };
  stressDetails?: { stressLevel: number };
  sleepDTO?: { sleepLevels: { deep: number; light: number; rem: number; awake: number } };
  steps?: number;
  activities?: Array<{ distance: number; calories: number }>;
}

interface FitbitData {
  'heart-date': string;
  'heart-rate-values'?: number[];
  'steps': number;
  'minutesAsleep'?: number;
  'minutesDeepSleep'?: number;
  'minutesLightSleep'?: number;
  'minutesREMSleep'?: number;
  'minutesAwake'?: number;
  'caloriesOut'?: number;
}

interface OuraData {
  date: string;
  score: number;
  sleep: {
    score: number;
    total: number;
    deep: number;
    light: number;
    rem: number;
    awake: number;
    efficiency: number;
  };
  readiness: number;
  activity: {
    score: number;
    steps: number;
    calories: number;
  };
}

class HealthDataMapper {
  mapFromAppleHealth(data: AppleHealthData): Record<string, unknown> {
    const timestamp = new Date(data.date).toISOString();

    return {
      timestamp,
      heart_rate: data.heart_rate ?? data.resting_heart_rate ?? null,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      oxygen_saturation: data.oxygen_saturation ? Math.round(data.oxygen_saturation * 100) : null,
      temperature: null,
      steps: data.step_count ?? null,
      sleep_seconds: this.parseSleepAnalysis(data.sleep_analysis),
      activity_calories: Math.round(data.active_energy ?? 0),
    };
  }

  mapFromHealthConnect(data: HealthConnectData): Record<string, unknown> {
    return {
      timestamp: new Date(data.instant).toISOString(),
      heart_rate: data.heart_rate?.value ?? null,
      blood_pressure_systolic: data.blood_pressure?.systolic?.value ?? null,
      blood_pressure_diastolic: data.blood_pressure?.diastolic?.value ?? null,
      oxygen_saturation: data.oxygen_saturation?.value
        ? Math.round(data.oxygen_saturation.value * 100)
        : null,
      temperature: data.body_temperature?.value ?? null,
      steps: data.steps?.count ?? null,
      sleep_seconds: this.parseSleepSession(data.sleep_session),
      activity_calories: data.active_calories?.energy?.value ?? null,
    };
  }

  mapFromGarmin(data: GarminData): Record<string, unknown> {
    const timestamp = new Date(data.summaryDate).toISOString();

    const sleep = data.sleepDTO?.sleepLevels;

    return {
      timestamp,
      heart_rate: data.heartRates?.restingHeartRate ?? null,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      oxygen_saturation: null,
      temperature: null,
      steps: data.steps ?? null,
      sleep_seconds: sleep
        ? (sleep.deep + sleep.light + sleep.rem + sleep.awake) * 60
        : null,
      activity_calories: data.activities?.[0]?.calories ?? null,
    };
  }

  mapFromFitbit(data: FitbitData): Record<string, unknown> {
    const timestamp = new Date(data['heart-date']).toISOString();
    const totalSleep = (data.minutesAsleep ?? 0) * 60;

    return {
      timestamp,
      heart_rate: data['heart-rate-values']?.[0] ?? null,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      oxygen_saturation: null,
      temperature: null,
      steps: data.steps ?? null,
      sleep_seconds: totalSleep,
      activity_calories: data.caloriesOut ?? null,
    };
  }

  mapFromOura(data: OuraData): Record<string, unknown> {
    const timestamp = new Date(data.date).toISOString();

    return {
      timestamp,
      heart_rate: null,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      oxygen_saturation: null,
      temperature: null,
      steps: data.activity.steps ?? null,
      sleep_seconds: data.sleep.total * 60,
      sleep_deep: data.sleep.deep * 60,
      sleep_light: data.sleep.light * 60,
      sleep_rem: data.sleep.rem * 60,
      sleep_awake: data.sleep.awake * 60,
      activity_calories: data.activity.calories ?? null,
    };
  }

  mapFromPolar(data: Record<string, unknown>): Record<string, unknown> {
    return {
      timestamp: (data['timestamp'] as string) || new Date().toISOString(),
      heart_rate: (data['heart_rate'] as number) ?? null,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      oxygen_saturation: (data['spo2'] as number) ?? null,
      temperature: null,
      steps: (data['steps'] as number) ?? null,
      sleep_seconds: (data['sleep_duration'] as number) ?? null,
      activity_calories: (data['calories'] as number) ?? null,
    };
  }

  mapFromSuunto(data: Record<string, unknown>): Record<string, unknown> {
    return {
      timestamp: (data['timestamp'] as string) || new Date().toISOString(),
      heart_rate: (data['heart_rate'] as number) ?? null,
      blood_pressure_systolic: null,
      blood_pressure_diastolic: null,
      oxygen_saturation: null,
      temperature: null,
      steps: (data['steps'] as number) ?? null,
      sleep_seconds: (data['sleep_duration'] as number) ?? null,
      activity_calories: (data['calories'] as number) ?? null,
    };
  }

  mapFromSamsung(data: Record<string, unknown>): Record<string, unknown> {
    return {
      timestamp: (data['date'] as string) || new Date().toISOString(),
      heart_rate: (data['heart_rate'] as number) ?? null,
      blood_pressure_systolic: (data['systolic'] as number) ?? null,
      blood_pressure_diastolic: (data['diastolic'] as number) ?? null,
      oxygen_saturation: (data['spo2'] as number) ?? null,
      temperature: null,
      steps: (data['step_count'] as number) ?? null,
      sleep_seconds: (data['sleep_duration'] as number) ?? null,
      activity_calories: (data['calories'] as number) ?? null,
    };
  }

  map(provider: WearableProvider, data: unknown): Record<string, unknown> {
    switch (provider) {
      case 'apple_health':
        return this.mapFromAppleHealth(data as AppleHealthData);
      case 'health_connect':
        return this.mapFromHealthConnect(data as HealthConnectData);
      case 'garmin':
        return this.mapFromGarmin(data as GarminData);
      case 'fitbit':
        return this.mapFromFitbit(data as FitbitData);
      case 'oura':
        return this.mapFromOura(data as OuraData);
      case 'polar':
        return this.mapFromPolar(data as Record<string, unknown>);
      case 'suunto':
        return this.mapFromSuunto(data as Record<string, unknown>);
      case 'samsung_health':
        return this.mapFromSamsung(data as Record<string, unknown>);
      default:
        return { timestamp: new Date().toISOString() };
    }
  }

  private parseSleepAnalysis(
    sleepData: AppleHealthData['sleep_analysis']
  ): number | null {
    if (!sleepData || sleepData.length === 0) return null;

    let totalSeconds = 0;
    for (const session of sleepData) {
      if (session.value === 'asleep' || session.value === 'asleepUnspecified') {
        const start = new Date(session.start).getTime();
        const end = new Date(session.end).getTime();
        totalSeconds += Math.floor((end - start) / 1000);
      }
    }

    return totalSeconds > 0 ? totalSeconds : null;
  }

  private parseSleepSession(
    session: HealthConnectData['sleep_session']
  ): number | null {
    if (!session) return null;

    const start = new Date(session.start_time).getTime();
    const end = new Date(session.end_time).getTime();
    return Math.floor((end - start) / 1000);
  }
}

export const healthDataMapper = new HealthDataMapper();