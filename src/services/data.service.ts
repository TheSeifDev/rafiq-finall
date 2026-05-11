/**
 * Data management service — privacy, export, delete
 *
 * All sensitive data operations flow through here.
 */
import { supabase } from '../lib/supabase';
import { patientService } from './patient.service';

export const dataService = {
  /**
   * Delete all user data (GDPR compliance)
   * Deletes in FK order: vitals → medications → conditions → contacts → patient → notifications
   */
  async deleteAllUserData(userId: string): Promise<void> {
    const patientId = await patientService.getPatientId(userId);

    if (patientId) {
      // Delete dependent rows first (FK order enforced by DB)
      await supabase.from('vitals').delete().eq('patient_id', patientId);
      await supabase.from('medications').delete().eq('patient_id', patientId);
      await supabase.from('patient_conditions').delete().eq('patient_id', patientId);
      await supabase.from('emergency_contacts').delete().eq('patient_id', patientId);
      await supabase.from('patients').delete().eq('id', patientId);
    }

    // Delete notifications
    await supabase.from('notifications').delete().eq('user_id', userId);
  },
};