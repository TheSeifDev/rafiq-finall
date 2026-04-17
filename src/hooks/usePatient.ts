import { useState, useEffect, useCallback } from 'react';
import { patientService } from '../services/patient.service';
import { useAuth } from '../store/AuthContext';
import type { Patient } from '../types/database';

interface UsePatientResult {
  patient: Patient | null;
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
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await patientService.getPatient(user.id);
      setPatient(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تحميل بيانات المريض';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

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
