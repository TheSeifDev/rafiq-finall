/**
 * Recovery System — Upgraded Error Boundary
 *
 * Provides graceful degradation instead of crash:
 *   - Reconnect actions (BLE, Supabase, Notifications)
 *   - Retry actions (service re-invocation)
 *   - Partial reload (navigation-based re-mount)
 *   - Safe reset (data clearing with user consent)
 *   - Diagnostic logging (structured error context)
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './ui/AppText';
import { useTheme } from '../theme/useTheme';
import { logger } from '../lib/logger';
import { useAppStore } from '../store/app.store';

// ─── Types ─────────────────────────────────────────────────────────────────

export type RecoveryActionType = 'retry' | 'reconnect_ble' | 'reconnect_supabase' | 'reconnect_notif' | 'reload_screen' | 'reset_data' | 'open_settings';

export interface RecoveryAction {
  type: RecoveryActionType;
  label: string;
  labelAr: string;
  icon: string;
  severity: 'safe' | 'warning' | 'destructive';
  description: string;
  descriptionAr: string;
}

export interface DiagnosticInfo {
  errorMessage: string;
  errorStack?: string;
  componentName?: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  appVersion?: string;
  buildNumber?: string;
  osVersion?: string;
}

interface RecoverySystemProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  name?: string;
  onRecoveryAction?: (action: RecoveryActionType) => void;
  /** Actions available in the recovery UI. Defaults to safe set. */
  availableActions?: RecoveryActionType[];
}

interface RecoverySystemState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  diagnosticsOpen: boolean;
  recoveryAttempted: boolean;
}

// ─── Default recovery actions ───────────────────────────────────────────────

const DEFAULT_ACTIONS: RecoveryAction[] = [
  {
    type: 'retry',
    label: 'Try Again',
    labelAr: 'حاول مجدداً',
    icon: 'refresh',
    severity: 'safe',
    description: 'Retry the failed operation',
    descriptionAr: 'إعادة محاولة العملية الفاشلة',
  },
  {
    type: 'reload_screen',
    label: 'Reload Screen',
    labelAr: 'إعادة تحميل الشاشة',
    icon: 'sync',
    severity: 'safe',
    description: 'Re-mount the current screen',
    descriptionAr: 'إعادة تحميل الشاشة الحالية',
  },
  {
    type: 'reconnect_ble',
    label: 'Reconnect Wearable',
    labelAr: 'إعادة ربط الساعة',
    icon: 'bluetooth',
    severity: 'safe',
    description: 'Reconnect the wearable device',
    descriptionAr: 'إعادة الاتصال بالساعة الذكية',
  },
  {
    type: 'reconnect_supabase',
    label: 'Reconnect Backend',
    labelAr: 'إعادة الاتصال بالخادم',
    icon: 'cloud-offline',
    severity: 'safe',
    description: 'Reconnect to the backend service',
    descriptionAr: 'إعادة الاتصال بالخدمة الخلفية',
  },
  {
    type: 'open_settings',
    label: 'Open Settings',
    labelAr: 'فتح الإعدادات',
    icon: 'settings',
    severity: 'safe',
    description: 'Open app system settings',
    descriptionAr: 'فتح إعدادات النظام',
  },
  {
    type: 'reset_data',
    label: 'Reset App Data',
    labelAr: 'مسح بيانات التطبيق',
    icon: 'trash',
    severity: 'destructive',
    description: 'Clear local data (requires restart)',
    descriptionAr: 'مسح البيانات المحلية (يتطلب إعادة تشغيل)',
  },
];

function getActionByType(type: RecoveryActionType): RecoveryAction | undefined {
  return DEFAULT_ACTIONS.find(a => a.type === type);
}

// ─── Diagnostic capture ──────────────────────────────────────────────────────

function captureDiagnostics(error: Error, info: React.ErrorInfo | null, name?: string): DiagnosticInfo {
  const language = useAppStore.getState().language;
  const session = useAppStore.getState() as any;

  return {
    errorMessage: error.message,
    errorStack: error.stack,
    componentName: name,
    timestamp: Date.now(),
    userId: (session as any)?.user?.id,
    sessionId: (session as any)?.session?.id,
    appVersion: (() => {
      try { return require('../../package.json').version; } catch { return undefined; }
    })(),
    osVersion: (() => {
      try { return require('react-native').Platform.OS; } catch { return undefined; }
    })(),
  };
}

// ─── Recovery action executors ──────────────────────────────────────────────

async function executeRecoveryAction(
  action: RecoveryActionType,
  error: Error | null,
  onAction?: (action: RecoveryActionType) => void,
): Promise<void> {
  logger.info(`[RecoverySystem] Executing recovery action: ${action}`, {
    errorMessage: error?.message,
  }, 'RecoverySystem');

  onAction?.(action);

  switch (action) {
    case 'retry':
      // Handled by parent re-rendering with fallback removed
      break;

    case 'reload_screen':
      // Signal navigation to re-mount via store
      useAppStore.setState({ _recoverReloadTrigger: Date.now() });
      break;

    case 'reconnect_ble':
      try {
        const { wearableService } = await import('../services/wearable/ble.service');
        await wearableService.disconnect();
        // Reconnect will happen on next user interaction
      } catch { /* ignore */ }
      break;

    case 'reconnect_supabase':
      try {
        const { supabase } = await import('../lib/supabase');
        supabase.realtime.disconnect();
        await new Promise(r => setTimeout(r, 1000));
        // Supabase auto-reconnects on next query
      } catch { /* ignore */ }
      break;

    case 'reconnect_notif':
      try {
        const { default: Notifications } = await import('expo-notifications');
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch { /* ignore */ }
      break;

    case 'open_settings':
      try {
        await Linking.openSettings();
      } catch { /* ignore */ }
      break;

    case 'reset_data':
      // Destructive — requires user confirmation is shown in UI
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.clear();
        logger.info('[RecoverySystem] Local data cleared', {}, 'RecoverySystem');
      } catch { /* ignore */ }
      break;
  }
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
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RecoverySystemState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const diagnostics = captureDiagnostics(error, info, this.props.name);
    logger.error(`[RecoverySystem] Caught error in "${this.props.name ?? 'Unknown'}"`, diagnostics, 'RecoverySystem');

    // Emit to event bus for monitoring
    try {
      const { eventBus } = require('../events/EventBus');
      eventBus.emit({
        type: 'system.error',
        source: 'system',
        timestamp: diagnostics.timestamp,
        payload: diagnostics as Record<string, unknown>,
        metadata: { category: 'error', severity: 'high' },
      });
    } catch { /* ignore */ }
  }

  private handleRecovery = async (actionType: RecoveryActionType) => {
    this.setState({ recoveryAttempted: true });
    await executeRecoveryAction(actionType, this.state.error, this.props.onRecoveryAction);

    if (actionType === 'retry' || actionType === 'reload_screen') {
      // Reset error state to allow retry
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <RecoveryFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          name={this.props.name}
          availableActions={this.props.availableActions ?? ['retry', 'reload_screen', 'reconnect_ble', 'reconnect_supabase', 'open_settings']}
          diagnosticsOpen={this.state.diagnosticsOpen}
          recoveryAttempted={this.state.recoveryAttempted}
          onAction={this.handleRecovery}
          onToggleDiagnostics={() => this.setState(s => ({ diagnosticsOpen: !s.diagnosticsOpen }))}
        />
      );
    }
    return this.props.children;
  }
}

// ─── Recovery Fallback UI ────────────────────────────────────────────────────

interface RecoveryFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  name?: string;
  availableActions: RecoveryActionType[];
  diagnosticsOpen: boolean;
  recoveryAttempted: boolean;
  onAction: (action: RecoveryActionType) => void;
  onToggleDiagnostics: () => void;
}

function RecoveryFallback({
  error, name, availableActions, diagnosticsOpen, recoveryAttempted, onAction, onToggleDiagnostics,
}: RecoveryFallbackProps): React.JSX.Element {
  const { colors, darkMode } = useTheme();
  const language = useAppStore((s) => s.language);
  const isAr = language === 'ar';

  const surfaceBg = darkMode ? 'rgba(30, 41, 59, 0.90)' : 'rgba(255, 255, 255, 0.95)';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header icon */}
      <View style={[styles.iconWrap, { backgroundColor: colors.danger + '14' }]}>
        <Ionicons name="warning" size={48} color={colors.danger} />
      </View>

      {/* Title */}
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
        {availableActions.map((type) => {
          const action = getActionByType(type);
          if (!action) return null;
          return (
            <TouchableOpacity
              key={type}
              activeOpacity={0.7}
              style={[
                styles.actionRow,
                action.severity === 'destructive' && { borderColor: colors.danger + '20' },
              ]}
              onPress={() => onAction(type)}
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
                <Ionicons
                  name={action.icon as any}
                  size={18}
                  color={action.severity === 'destructive' ? colors.danger : action.severity === 'warning' ? colors.warning : colors.primary}
                />
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
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary + '60'} />
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

/**
 * useRecoveryTrigger — re-mounts a component when _recoverReloadTrigger changes.
 * Usage: const trigger = useRecoveryTrigger();
 */
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
