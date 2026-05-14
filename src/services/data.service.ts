/**
 * Data management service — privacy, export, delete
 *
 * All sensitive data operations flow through here.
 */
import { patientService } from './patient.service';
import { deleteLocal, listWhere } from '../local/repository';

export const dataService = {
  /**
   * Delete all user data (GDPR compliance)
   * Deletes in FK order: vitals → medications → conditions → contacts → patient → notifications
   */
  async deleteAllUserData(userId: string): Promise<void> {
    const patientId = await patientService.getPatientId(userId);

    if (patientId) {
      const dependentTables = ['vitals', 'vitals_readings', 'medications', 'patient_conditions', 'emergency_contacts'];
      for (const table of dependentTables) {
        const rows = await listWhere<Record<string, unknown>>(table, 'patient_id = ?', [patientId]);
        for (const row of rows) await deleteLocal(table, String(row.id), { hard: true, userId });
      }
      await deleteLocal('patients', patientId, { hard: true, userId, priority: 'high' });
    }

    const notifications = await listWhere<Record<string, unknown>>('notifications', 'user_id = ?', [userId]);
    for (const row of notifications) await deleteLocal('notifications', String(row.id), { hard: true, userId });
  },
};
