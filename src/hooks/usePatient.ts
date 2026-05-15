import { useState, useEffect, useCallback } from 'react';
import { patientService } from '../services/patient.service';
import { useAuthStore } from '../store/auth.store';
import type { PatientNormalizedRow } from '../repositories/PatientRepository';

interface UsePatientResult {
  patient: PatientNormalizedRow | null;
  patientId: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Resolves the current user's Patient record.
 * Provides loading/error states and a manual refresh function.
 * All screens needing a patientId should use this hook instead of
 * calling patientService.getPatientId() directly.
 */
export function usePatient(): UsePatientResult {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id ?? null;

  const [patient, setPatient] = useState<PatientNormalizedRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await patientService.getProfile(userId);
      setPatient(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load patient data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    patient,
    patientId: patient?.id ?? null,
    loading,
    error,
    refresh: load,
  };
}
