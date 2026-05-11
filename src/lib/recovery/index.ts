/**
 * Recovery System — Entry Point
 *
 * Exports the modular recovery architecture.
 * RecoverySystem class + hooks + diagnostic utilities.
 */
export { RecoverySystem } from './RecoverySystem';
export { useRecoveryTrigger } from './RecoverySystem';
export type { RecoveryActionType, RecoveryContext, RecoveryStrategy } from './actionRegistry';
export { getRecoveryActions, executeRecoveryAction, getRecoveryAction } from './actionRegistry';
export { getRecoveryContext, incrementRecoveryAttempt, resetRecoveryAttempts } from './contextBuilder';
