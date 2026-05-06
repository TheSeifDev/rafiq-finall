import { useState, useEffect, useCallback } from 'react';
import { medicationService, type Medication } from '../services/medication.service';

interface UseMedicationsResult {
  medications: Medication[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches medications for a given patient.
 * Automatically re-fetches when `patientId` changes.
 */
export function useMedications(patientId: string | null): UseMedicationsResult {
  const [medications, setMedications] = useState<Medication[]>([]);
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
      const data = await medicationService.getMedications(patientId);
      setMedications(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل الأدوية';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    medications,
    loading,
    error,
    refresh: load,
  };
}
