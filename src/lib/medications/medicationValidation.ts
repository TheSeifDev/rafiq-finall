import { normalizeTime } from './medicationSchedule';

export type MedicationFormDraft = {
  name: string;
  strength: string;
  category: string;
  reason: string;
  form: string;
  scheduleType: string;
  mealRule: string;
  times: string[];
  quantityType: string;
  totalQuantity: string;
  remainingQuantity: string;
  refillThreshold: string;
  notes: string;
  doctorName: string;
};

export type MedicationFormErrors = Partial<Record<keyof MedicationFormDraft, string>> & { _global?: string };

function parseNonNegativeNumber(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return n;
}

export function validateMedicationDraft(draft: MedicationFormDraft, opts: { isRTL: boolean }): {
  ok: boolean;
  errors: MedicationFormErrors;
  normalized: {
    name: string;
    strength: string | null;
    category: string | null;
    reason: string | null;
    form: string | null;
    schedule_type: string | null;
    meal_rule: string | null;
    times: Array<{ time: string; meal_rule?: string | null }>;
    quantity_type: string | null;
    total_quantity: number | null;
    remaining_quantity: number | null;
    refill_threshold: number | null;
    notes: string | null;
    doctor_name: string | null;
  };
} {
  const errors: MedicationFormErrors = {};
  const isRTL = opts.isRTL;

  const name = draft.name.trim();
  if (!name) errors.name = isRTL ? 'اسم الدواء مطلوب' : 'Name is required';

  const strength = draft.strength.trim() || null;
  const category = draft.category.trim() || null;
  const reason = draft.reason.trim() || null;
  const form = draft.form.trim() || null;

  const scheduleType = draft.scheduleType.trim() || null;
  const mealRule = draft.mealRule.trim() || null;

  const rawTimes = Array.isArray(draft.times) ? draft.times : [];
  const timesNormalized = rawTimes
    .map((t) => normalizeTime(t) ?? '')
    .filter(Boolean)
    .map((time) => ({ time, meal_rule: mealRule }));

  if ((scheduleType ?? '') !== 'weekly' && timesNormalized.length === 0) {
    errors.times = isRTL ? 'أضف وقت جرعة واحد على الأقل' : 'Add at least one dose time';
  }

  const quantityType = draft.quantityType.trim() || null;
  const total = parseNonNegativeNumber(draft.totalQuantity);
  const remaining = parseNonNegativeNumber(draft.remainingQuantity);
  const threshold = parseNonNegativeNumber(draft.refillThreshold);

  if (Number.isNaN(total)) errors.totalQuantity = isRTL ? 'رقم غير صالح' : 'Invalid number';
  if (Number.isNaN(remaining)) errors.remainingQuantity = isRTL ? 'رقم غير صالح' : 'Invalid number';
  if (Number.isNaN(threshold)) errors.refillThreshold = isRTL ? 'رقم غير صالح' : 'Invalid number';

  const totalQuantity = total === null || Number.isNaN(total) ? null : total;
  const remainingQuantity = remaining === null || Number.isNaN(remaining) ? null : remaining;
  const refillThreshold = threshold === null || Number.isNaN(threshold) ? null : threshold;

  if (totalQuantity !== null && remainingQuantity !== null && remainingQuantity > totalQuantity) {
    errors.remainingQuantity = isRTL ? 'المتبقي لا يمكن أن يتجاوز الإجمالي' : 'Remaining cannot exceed total';
  }

  const notes = draft.notes.trim() || null;
  const doctorName = draft.doctorName.trim() || null;

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    normalized: {
      name,
      strength,
      category,
      reason,
      form,
      schedule_type: scheduleType,
      meal_rule: mealRule,
      times: timesNormalized,
      quantity_type: quantityType,
      total_quantity: totalQuantity,
      remaining_quantity: remainingQuantity,
      refill_threshold: refillThreshold,
      notes,
      doctor_name: doctorName,
    },
  };
}

