import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '../store/auth.store';
import { useAppStore } from '../store/app.store';
import { patientService } from '../services/patient.service';
import { translations } from '../constants/translations';
import type { Patient, AddressData, ReporterData, HospitalData, EmergencyContact, EmergencyContactInsert } from '../types/database';

export interface ProfileFormState {
  fullName: string;
  phone: string;
  age: string;
  gender: string | null;
  bloodType: string | null;
  address: AddressData;
  reporter: ReporterData;
  hospital: HospitalData;
  conditions: string[];
  conditionNotes: string;
  latitude: number | null;
  longitude: number | null;
  geocodedAddress: string | null;
}

const EMPTY_FORM: ProfileFormState = {
  fullName: '', phone: '', age: '', gender: null, bloodType: null,
  address: {}, reporter: {}, hospital: {},
  conditions: [], conditionNotes: '',
  latitude: null, longitude: null, geocodedAddress: null,
};

function formFromPatient(p: Patient): ProfileFormState {
  return {
    fullName: p.full_name ?? '',
    phone: p.phone ?? '',
    age: p.age?.toString() ?? '',
    gender: p.gender,
    bloodType: p.blood_type,
    address: p.address_data ?? {},
    reporter: p.reporter_data ?? {},
    hospital: p.hospital_data ?? {},
    conditions: [],
    conditionNotes: '',
    latitude: p.latitude,
    longitude: p.longitude,
    geocodedAddress: p.geocoded_address,
  };
}

export function useEmergencyProfile() {
  const session = useAuthStore((s) => s.session);
  const language = useAppStore((s) => s.language);
  const t = translations[language] as any;
  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? '';

  const [profileId, setProfileId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initialSnapshot = useRef<string>('');
  const initialContactsSnapshot = useRef<string>('');

  const isDirty = useMemo(() => {
    const currentSnap = JSON.stringify(form);
    const currentContactsSnap = JSON.stringify(contacts);
    return currentSnap !== initialSnapshot.current || currentContactsSnap !== initialContactsSnapshot.current;
  }, [form, contacts]);

  const loadProfile = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const profile = await patientService.getProfile(userId);
      if (profile) {
        setProfileId(profile.id);
        const f = formFromPatient(profile);
        const conds = await patientService.getConditions(profile.id);
        f.conditions = conds.map((c) => c.condition_name);
        const otherCond = conds.find((c) => c.condition_name === 'other');
        f.conditionNotes = otherCond?.notes ?? '';
        setForm(f);
        initialSnapshot.current = JSON.stringify(f);

        const ecs = await patientService.getEmergencyContacts(profile.id);
        setContacts(ecs);
        initialContactsSnapshot.current = JSON.stringify(ecs);
      }
    } catch { /* swallow — profile may not exist yet */ }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const updateField = useCallback(<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateAddress = useCallback((key: keyof AddressData, value: string) => {
    setForm((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));
  }, []);

  const updateReporter = useCallback((key: keyof ReporterData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, reporter: { ...prev.reporter, [key]: value } }));
  }, []);

  const updateHospital = useCallback((key: keyof HospitalData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, hospital: { ...prev.hospital, [key]: value } }));
  }, []);

  const toggleCondition = useCallback((key: string) => {
    setForm((prev) => {
      const has = prev.conditions.includes(key);
      return { ...prev, conditions: has ? prev.conditions.filter((c) => c !== key) : [...prev.conditions, key] };
    });
  }, []);

  const addContact = useCallback((c: Omit<EmergencyContactInsert, 'patient_id'>) => {
    if (!profileId) return;
    const name = typeof c.name === 'string' ? c.name : '';
    const relation = typeof c.relation === 'string' ? c.relation : '';
    const phone = typeof c.phone === 'string' ? c.phone : '';
    const priority = typeof c.priority === 'number' ? c.priority : contacts.length;
    const isPrimary = typeof c.is_primary === 'boolean' ? c.is_primary : false;
    const temp: EmergencyContact = {
      id: `temp_${Date.now()}`,
      patient_id: profileId,
      name,
      relation,
      phone,
      priority,
      is_primary: isPrimary ? 1 : 0,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: null,
      version: 1,
      updated_by_device: null,
      is_deleted: 0,
      deleted_at: null,
      deleted_by: null,
    };
    setContacts((prev) => [...prev, temp]);
  }, [profileId, contacts.length]);

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<EmergencyContact>) => {
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const validate = useCallback((): string[] => {
    const errors: string[] = [];
    if (!form.fullName.trim()) errors.push(t.nameRequired);
    if (!form.phone.trim()) errors.push(t.phoneRequired);
    if (!form.address.governorate?.trim() && !form.address.street?.trim()) errors.push(t.addressRequired);
    return errors;
  }, [form, t]);

  const save = useCallback(async () => {
    const errors = validate();
    if (errors.length > 0) {
      setStatusMsg({ type: 'error', text: errors[0] });
      return;
    }
    if (!profileId) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await patientService.updateProfile(profileId, {
        full_name: form.fullName.trim(),
        phone: form.phone.trim() || null,
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender as Patient['gender'],
        blood_type: form.bloodType,
        address_data: form.address,
        reporter_data: form.reporter,
        hospital_data: form.hospital,
        latitude: form.latitude,
        longitude: form.longitude,
        geocoded_address: form.geocodedAddress,
      });

      await patientService.syncConditions(
        profileId,
        form.conditions.map((key) => ({
          patient_id: profileId,
          condition_name: key,
          notes: key === 'other' ? form.conditionNotes : null,
        })),
      );

      // Sync emergency contacts
      const existingIds = new Set<string>();
      for (const c of contacts) {
        if (c.id.startsWith('temp_')) {
          await patientService.upsertEmergencyContact({
            patient_id: profileId, name: c.name, relation: c.relation,
            phone: c.phone, priority: c.priority, is_primary: c.is_primary ? true : false,
          });
        } else {
          existingIds.add(c.id);
          await patientService.upsertEmergencyContact({
            id: c.id, patient_id: profileId, name: c.name, relation: c.relation,
            phone: c.phone, priority: c.priority, is_primary: c.is_primary ? true : false,
          });
        }
      }

      // Reload to get server-generated IDs
      await loadProfile();
      setStatusMsg({ type: 'success', text: t.saved });
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.saveFailed;
      setStatusMsg({ type: 'error', text: msg });
      console.warn('[EmergencyProfile] save error:', err);
    } finally {
      setSaving(false);
    }
  }, [profileId, form, contacts, validate, loadProfile, t]);

  return {
    form, contacts, loading, saving, isDirty, statusMsg, email, profileId,
    updateField, updateAddress, updateReporter, updateHospital,
    toggleCondition, addContact, removeContact, updateContact, save,
    setStatusMsg,
  };
}
