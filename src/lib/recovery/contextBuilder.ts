/**
 * Recovery Context Builder
 *
 * Captures contextual information at error time for:
 *   - Smart action availability
 *   - Targeted recovery
 *   - Diagnostic reporting
 */
import { useAppStore } from '../../store/app.store';
import { useAuthStore } from '../../store/auth.store';
import type { RecoveryContext } from './actionRegistry';

let recoveryAttemptCount = 0;

export function getRecoveryContext(partial?: Partial<RecoveryContext>): RecoveryContext {
  const appState = useAppStore.getState();
  const authState = useAuthStore.getState();

  const ctx: RecoveryContext = {
    attemptCount: recoveryAttemptCount,
    isAuthenticated: !!(authState.session?.user?.id),
    componentName: partial?.componentName,
    error: partial?.error,
    sessionId: authState.session?.user?.id,
    userId: authState.session?.user?.id,
  };

  return ctx;
}

export function incrementRecoveryAttempt(): void {
  recoveryAttemptCount++;
}

export function resetRecoveryAttempts(): void {
  recoveryAttemptCount = 0;
}

export function getRecoveryAttemptCount(): number {
  return recoveryAttemptCount;
}
