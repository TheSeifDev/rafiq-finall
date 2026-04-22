/**
 * Converts numeric-like values to finite numbers.
 * Returns null for empty, invalid, or non-finite inputs.
 */
export function toFiniteNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

/**
 * Strict alias that keeps null for invalid numeric inputs.
 */
export function toFiniteNumber(value: unknown): number | null {
  return toFiniteNumberOrNull(value);
}
