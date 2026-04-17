import { useState, useEffect, useCallback } from 'react';
import { vitalsReadingService } from '../services/vitals-reading.service';
import type { VitalsReading } from '../types/database';

interface UseVitalsResult {
  readings: VitalsReading[];
  latest: VitalsReading | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches vitals history from the `vitals_readings` table for a given patient.
 * Automatically re-fetches when `patientId` changes.
 * Subscribes to real-time inserts and prepends new readings instantly.
 */
export function useVitals(patientId: string | null): UseVitalsResult {
  const [readings, setReadings] = useState<VitalsReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await vitalsReadingService.getHistory(patientId);
      setReadings(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل المؤشرات الحيوية';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  // Initial load
  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!patientId) return;

    const channel = vitalsReadingService.subscribeToReadings(
      patientId,
      (newReading) => {
        setReadings((prev) => [newReading, ...prev]);
      }
    );

    return () => {
      channel.unsubscribe();
    };
  }, [patientId]);

  return {
    readings,
    latest: readings[0] ?? null,
    loading,
    error,
    refresh: load,
  };
}
