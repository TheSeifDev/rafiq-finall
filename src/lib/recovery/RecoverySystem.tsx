/**
 * Recovery System — Production-Grade Error Boundary
 *
 * Modular recovery with:
 *   - Reconnect actions (BLE, Supabase, Notifications)
 *   - Retry actions (service re-invocation)
 *   - Partial reload (navigation-based re-mount)
 *   - Safe reset (data clearing with user consent)
 *   - Diagnostic logging (structured error context)
 *   - Recovery attempt tracking
 *
 * Architecture:
 *   ErrorBoundary → catches error → RecoverySystem UI
 *   RecoverySystem → actionRegistry → executes → resets state
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '../../components/ui/AppText';
import { useTheme } from '../../theme/useTheme';
import { useAppStore } from '../../store/app.store';
import { logger } from '../logger';
import { eventBus } from '../../events/EventBus';
import {
  getRecoveryActions,
  executeRecoveryAction,
  type RecoveryActionType,
} from './actionRegistry';
import { getRecoveryContext, incrementRecoveryAttempt } from './contextBuilder';

// ─── Types ────────────────────────────────────────────────────────────────

interface RecoverySystemProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
  availableActions?: RecoveryActionType[];
}

interface RecoverySystemState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  diagnosticsOpen: boolean;
  recoveryAttempted: boolean;
  selectedAction: RecoveryActionType | null;
}

// ─── Main Recovery System Class ──────────────────────────────────────────────

export class RecoverySystem extends React.Component<RecoverySystemProps, RecoverySystemState> {
  constructor(props: RecoverySystemProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      diagnosticsOpen: false,
      recoveryAttempted: false,
      selectedAction: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RecoverySystemState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const ctx = getRecoveryContext({ error, componentName: this.props.name });
    logger.error(`[RecoverySystem] Caught error in "${this.props.name ?? 'Unknown'}"`, {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: info.componentStack,
      sessionId: ctx.sessionId,
      attemptCount: ctx.attemptCount,
    }, 'RecoverySystem');

    eventBus.emit({
      type: 'system.error',
      source: 'system',
      timestamp: Date.now(),
      payload: {
        errorMessage: error.message,
        errorStack: error.stack,
        componentName: this.props.name,
        timestamp: Date.now(),
        sessionId: ctx.sessionId,
        userId: ctx.userId,
      } as Record<string, unknown>,
      metadata: { category: 'error', severity: 'high' },
    });
  }

  private handleAction = async (actionType: RecoveryActionType) => {
    incrementRecoveryAttempt();
    this.setState({ recoveryAttempted: true, selectedAction: actionType });

    const ctx = getRecoveryContext({
      error: this.state.error,
      componentName: this.props.name,
    });

    await executeRecoveryAction(actionType, ctx);

    // Reset on retry/reload actions
    if (actionType === 'retry' || actionType === 'reload_screen') {
      this.setState({ hasError: false, error: null, errorInfo: null, recoveryAttempted: false, selectedAction: null });
    } else {
      setTimeout(() => this.setState({ recoveryAttempted: false, selectedAction: null }), 2000);
    }
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <RecoveryFallback
          error={this.state.error}
          name={this.props.name}
          availableActions={this.props.availableActions ?? ['retry', 'reload_screen', 'reconnect_ble', 'reconnect_supabase', 'open_settings']}
          diagnosticsOpen={this.state.diagnosticsOpen}
          recoveryAttempted={this.state.recoveryAttempted}
          selectedAction={this.state.selectedAction}
          onAction={this.handleAction}
          onToggleDiagnostics={() => this.setState(s => ({ diagnosticsOpen: !s.diagnosticsOpen }))}
        />
      );
    }
    return this.props.children;
  }
}

// ─── Recovery Fallback UI ───────────────────────────────────────────────────

interface RecoveryFallbackProps {
  error: Error | null;
  name?: string;
  availableActions: RecoveryActionType[];
  diagnosticsOpen: boolean;
  recoveryAttempted: boolean;
  selectedAction: RecoveryActionType | null;
  onAction: (action: RecoveryActionType) => void;
  onToggleDiagnostics: () => void;
}

function RecoveryFallback({
  error, name, availableActions, diagnosticsOpen, recoveryAttempted, selectedAction, onAction, onToggleDiagnostics,
}: RecoveryFallbackProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const language = useAppStore.getState().language;
  const isAr = language === 'ar';

  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.90)' : 'rgba(255, 255, 255, 0.95)';
  const ctx = getRecoveryContext({ componentName: name, error });
  const actions = getRecoveryActions(ctx).filter(a => availableActions.includes(a.type));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header icon */}
      <View style={[styles.iconWrap, { backgroundColor: colors.danger + '14' }]}>
        <Ionicons name="warning" size={48} color={colors.danger} />
      </View>

      <AppText style={[styles.title, { color: colors.textPrimary }]}>
        {isAr ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
      </AppText>

      {name && (
        <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isAr ? `في: ${name}` : `In: ${name}`}
        </AppText>
      )}

      {/* Recovery actions */}
      <View style={[styles.actionsCard, { backgroundColor: surfaceBg }]}>
        <AppText style={[styles.actionsLabel, { color: colors.textSecondary }]}>
          {isAr ? 'إجراءات الاسترداد' : 'Recovery Actions'}
        </AppText>
        {actions.map((action) => {
          const isSelected = selectedAction === action.type;
          return (
            <TouchableOpacity
              key={action.type}
              activeOpacity={0.7}
              style={[
                styles.actionRow,
                isSelected && { backgroundColor: colors.primary + '14' },
              ]}
              onPress={() => onAction(action.type)}
              disabled={recoveryAttempted}
            >
              <View style={[
                styles.actionIconWrap,
                {
                  backgroundColor: action.severity === 'destructive'
                    ? colors.danger + '14'
                    : action.severity === 'warning'
                      ? colors.warning + '14'
                      : colors.primary + '14',
                },
              ]}>
                {isSelected ? (
                  <Ionicons name="hourglass" size={18} color={colors.primary} />
                ) : (
                  <Ionicons
                    name={action.icon as any}
                    size={18}
                    color={action.severity === 'destructive' ? colors.danger : action.severity === 'warning' ? colors.warning : colors.primary}
                  />
                )}
              </View>
              <View style={styles.actionContent}>
                <AppText style={[
                  styles.actionLabel,
                  { color: action.severity === 'destructive' ? colors.danger : colors.textPrimary },
                ]}>
                  {isAr ? action.labelAr : action.label}
                </AppText>
                <AppText style={[styles.actionDesc, { color: colors.textSecondary }]}>
                  {isAr ? action.descriptionAr : action.description}
                </AppText>
              </View>
              {!isSelected && (
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary + '60'} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Diagnostics toggle */}
      <TouchableOpacity activeOpacity={0.7} onPress={onToggleDiagnostics} style={styles.diagToggle}>
        <Ionicons
          name={diagnosticsOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
        <AppText style={[styles.diagToggleText, { color: colors.textSecondary }]}>
          {isAr ? 'معلومات التصحيح' : 'Diagnostic Info'}
        </AppText>
      </TouchableOpacity>

      {diagnosticsOpen && __DEV__ && error && (
        <View style={[styles.diagBox, { backgroundColor: surfaceBg, borderColor: colors.border + '40' }]}>
          <AppText style={[styles.diagText, { color: colors.danger }]} numberOfLines={10}>
            {error.message}
          </AppText>
          {error.stack && (
            <AppText style={[styles.diagTextSmall, { color: colors.textSecondary }]} numberOfLines={6}>
              {error.stack}
            </AppText>
          )}
        </View>
      )}

      {recoveryAttempted && (
        <AppText style={[styles.recoveredNote, { color: colors.textSecondary }]}>
          {isAr ? 'جاري الاسترداد...' : 'Recovery in progress...'}
        </AppText>
      )}
    </View>
  );
}

// ─── Hook for retry trigger ─────────────────────────────────────────────────

export function useRecoveryTrigger(): number {
  return useAppStore((s) => (s as any)._recoverReloadTrigger ?? 0);
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 48,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  actionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDesc: {
    fontSize: 11,
  },
  diagToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  diagToggleText: {
    fontSize: 12,
  },
  diagBox: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  diagText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  diagTextSmall: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  recoveredNote: {
    fontSize: 12,
    marginTop: 8,
  },
});
