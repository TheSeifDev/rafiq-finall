export type StockSeverity = 'safe' | 'low' | 'urgent';

export function classifyStock(opts: {
  remainingQuantity?: number | null;
  refillThreshold?: number | null;
}): { severity: StockSeverity; remaining: number | null; threshold: number | null } {
  const remaining = typeof opts.remainingQuantity === 'number' && Number.isFinite(opts.remainingQuantity) ? opts.remainingQuantity : null;
  const threshold = typeof opts.refillThreshold === 'number' && Number.isFinite(opts.refillThreshold) ? opts.refillThreshold : null;

  if (remaining === null) return { severity: 'safe', remaining: null, threshold };
  if (remaining <= 0) return { severity: 'urgent', remaining, threshold };
  if (threshold !== null && remaining <= threshold) return { severity: 'low', remaining, threshold };
  return { severity: 'safe', remaining, threshold };
}

export function safeNumber(input: unknown): number | null {
  if (typeof input !== 'number') return null;
  if (!Number.isFinite(input)) return null;
  return input;
}

