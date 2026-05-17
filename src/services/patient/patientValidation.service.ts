/**
 * Patient Profile Validation Engine — Detects incomplete medical data
 * Validates all patient fields according to strict rules
 */

export interface PatientProfileValidation {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
}

export interface PatientProfile {
  full_name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  blood_type?: string | null;
  emergency_contact?: string | null;
  address?: string | null;
  medical_conditions?: string | null;
  medications?: string | null;
  allergies?: string | null;
  reporter_data?: string | null;
  hospital_data?: string | null;
  phone?: string | null;
}

const VALIDATION_FIELDS: { key: keyof PatientProfile; label: string }[] = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'birth_date', label: 'Birth Date' },
  { key: 'gender', label: 'Gender' },
  { key: 'blood_type', label: 'Blood Type' },
  { key: 'emergency_contact', label: 'Emergency Contact' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'medical_conditions', label: 'Medical Conditions' },
  { key: 'medications', label: 'Medications' },
  { key: 'allergies', label: 'Allergies' },
  { key: 'reporter_data', label: 'Reporter Data' },
  { key: 'hospital_data', label: 'Hospital Data' },
];

function isFieldValid(value: unknown): boolean {
  // null = invalid
  if (value === null) return false;

  // undefined = invalid
  if (value === undefined) return false;

  // empty string = invalid
  if (typeof value === 'string' && value.trim() === '') return false;

  // empty object = invalid
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return false;
    // Check if all nested values are empty
    const allEmpty = keys.every((key) => isFieldValid((value as Record<string, unknown>)[key]));
    if (allEmpty) return false;
  }

  // empty array = invalid
  if (Array.isArray(value) && value.length === 0) return false;

  return true;
}

class PatientValidationService {
  /**
   * Validate patient profile and return detailed validation result
   */
  validatePatientProfile(profile: PatientProfile | null): PatientProfileValidation {
    if (!profile) {
      return {
        isComplete: false,
        missingFields: VALIDATION_FIELDS.map((f) => f.label),
        completionPercentage: 0,
      };
    }

    const missingFields: string[] = [];

    for (const field of VALIDATION_FIELDS) {
      const value = profile[field.key];

      if (!isFieldValid(value)) {
        missingFields.push(field.label);
      }
    }

    const totalFields = VALIDATION_FIELDS.length;
    const filledFields = totalFields - missingFields.length;
    const completionPercentage = Math.round((filledFields / totalFields) * 100);

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      completionPercentage,
    };
  }

  /**
   * Quick check if profile is complete (for use in conditional rendering)
   */
  isProfileComplete(profile: PatientProfile | null): boolean {
    return this.validatePatientProfile(profile).isComplete;
  }

  /**
   * Get list of missing field keys (for programmatic use)
   */
  getMissingFieldKeys(profile: PatientProfile | null): (keyof PatientProfile)[] {
    if (!profile) {
      return VALIDATION_FIELDS.map((f) => f.key);
    }

    const missing: (keyof PatientProfile)[] = [];

    for (const field of VALIDATION_FIELDS) {
      if (!isFieldValid(profile[field.key])) {
        missing.push(field.key);
      }
    }

    return missing;
  }

  /**
   * Get validation summary for display
   */
  getValidationSummary(profile: PatientProfile | null): string {
    const validation = this.validatePatientProfile(profile);

    if (validation.isComplete) {
      return 'Profile is complete';
    }

    const count = validation.missingFields.length;
    return `${count} field${count > 1 ? 's' : ''} missing: ${validation.missingFields.join(', ')}`;
  }
}

export const patientValidationService = new PatientValidationService();