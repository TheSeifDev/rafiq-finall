/**
 * Recovery Action Registry
 *
 * Defines all available recovery actions with metadata and executors.
 * Each action has: type, labels, icon, severity, strategy, executor.
 *
 * Architecture:
 *   RecoverySystem → ActionRegistry → getActions / executeAction
 */
import { logger } from '../logger';
import { useAppStore } from '../../store/app.store';

// ─── Types ────────────────────────────────────────────────────────────────

export type RecoveryActionType =
  | 'retry'
  | 'reload_screen'
  | 'reconnect_ble'
  | 'reconnect_supabase'
  | 'reconnect_notif'
  | 'reload_data'
  | 'open_settings'
  | 'contact_support'
  | 'clear_cache'
  | 'restart_app';

export type RecoveryStrategy = 'safe' | 'warning' | 'destructive';

export interface RecoveryActionDefinition {
  type: RecoveryActionType;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  severity: RecoveryStrategy;
  /** Whether this action is available for the given context */
  isAvailable?: (context: RecoveryContext) => boolean;
  /** Executor function */
  execute: (context: RecoveryContext) => Promise<void>;
  /** Priority (lower = shown first) */
  priority: number;
}

export interface RecoveryContext {
  error?: Error | null;
  componentName?: string;
  sessionId?: string;
  userId?: string;
  /** Number of previous recovery attempts */
  attemptCount: number;
  /** Whether the app is authenticated */
  isAuthenticated: boolean;
  /** BLE connection state */
  bleState?: string;
  /** Supabase connection state */
  supabaseState?: string;
}

// ─── Action executors ──────────────────────────────────────────────────────

async function execReloadScreen(ctx: RecoveryContext): Promise<void> {
  useAppStore.setState({ _recoverReloadTrigger: Date.now() });
}

async function execReconnectBLE(ctx: RecoveryContext): Promise<void> {
  try {
    const { wearableService } = await import('../../services/wearable/ble.service');
    await wearableService.disconnect();
  } catch { /* ignore */ }
}

async function execReconnectSupabase(ctx: RecoveryContext): Promise<void> {
  try {
    const { supabase } = await import('../supabase');
    supabase.realtime.disconnect();
    await new Promise(r => setTimeout(r, 1000));
  } catch { /* ignore */ }
}

async function execReconnectNotif(ctx: RecoveryContext): Promise<void> {
  try {
    const { default: Notifications } = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch { /* ignore */ }
}

async function execOpenSettings(ctx: RecoveryContext): Promise<void> {
  try {
    const { Linking } = await import('react-native');
    await Linking.openSettings();
  } catch { /* ignore */ }
}

async function execReloadData(ctx: RecoveryContext): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.clear();
    logger.info('[Recovery] Local data cleared', {}, 'RecoverySystem');
  } catch { /* ignore */ }
}

async function execContactSupport(ctx: RecoveryContext): Promise<void> {
  try {
    const { Linking } = await import('react-native');
    await Linking.openURL('mailto:support@rafiq.health?subject=App+Error+Report');
  } catch { /* ignore */ }
}

async function execClearCache(ctx: RecoveryContext): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(k => k.startsWith('rafiq_'));
    await AsyncStorage.multiRemove(appKeys);
    logger.info('[Recovery] Cache cleared', { keysCleared: appKeys.length }, 'RecoverySystem');
  } catch { /* ignore */ }
}

// ─── Registry ──────────────────────────────────────────────────────────────

const ALL_ACTIONS: RecoveryActionDefinition[] = [
  {
    type: 'retry',
    label: 'Try Again',
    labelAr: 'حاول مجدداً',
    description: 'Retry the failed operation',
    descriptionAr: 'إعادة محاولة العملية الفاشلة',
    icon: 'refresh',
    severity: 'safe',
    priority: 1,
    execute: async () => { /* handled by parent re-render */ },
  },
  {
    type: 'reload_screen',
    label: 'Reload Screen',
    labelAr: 'إعادة تحميل الشاشة',
    description: 'Re-mount the current screen',
    descriptionAr: 'إعادة تحميل الشاشة الحالية',
    icon: 'sync',
    severity: 'safe',
    priority: 2,
    execute: execReloadScreen,
  },
  {
    type: 'reconnect_ble',
    label: 'Reconnect Wearable',
    labelAr: 'إعادة ربط الساعة',
    description: 'Reconnect the wearable device',
    descriptionAr: 'إعادة الاتصال بالساعة الذكية',
    icon: 'bluetooth',
    severity: 'safe',
    isAvailable: (ctx) => ctx.bleState !== undefined && ctx.bleState !== 'active',
    priority: 3,
    execute: execReconnectBLE,
  },
  {
    type: 'reconnect_supabase',
    label: 'Reconnect Backend',
    labelAr: 'إعادة الاتصال بالخادم',
    description: 'Reconnect to the backend service',
    descriptionAr: 'إعادة الاتصال بالخدمة الخلفية',
    icon: 'cloud-offline',
    severity: 'safe',
    isAvailable: (ctx) => ctx.supabaseState !== undefined && ctx.supabaseState !== 'active',
    priority: 4,
    execute: execReconnectSupabase,
  },
  {
    type: 'reconnect_notif',
    label: 'Recheck Notifications',
    labelAr: 'إعادة التحقق من الإشعارات',
    description: 'Re-request notification permissions',
    descriptionAr: 'إعادة طلب صلاحيات الإشعارات',
    icon: 'notifications-outline',
    severity: 'safe',
    priority: 5,
    execute: execReconnectNotif,
  },
  {
    type: 'open_settings',
    label: 'Open Settings',
    labelAr: 'فتح الإعدادات',
    description: 'Open app system settings',
    descriptionAr: 'فتح إعدادات النظام',
    icon: 'settings',
    severity: 'safe',
    priority: 6,
    execute: execOpenSettings,
  },
  {
    type: 'clear_cache',
    label: 'Clear Cache',
    labelAr: 'مسح الذاكرة المؤقتة',
    description: 'Clear cached app data',
    descriptionAr: 'مسح البيانات المخزنة مؤقتاً',
    icon: 'trash-outline',
    severity: 'warning',
    priority: 7,
    execute: execClearCache,
  },
  {
    type: 'reload_data',
    label: 'Reset App Data',
    labelAr: 'مسح بيانات التطبيق',
    description: 'Clear all local data (requires restart)',
    descriptionAr: 'مسح جميع البيانات المحلية (يتطلب إعادة تشغيل)',
    icon: 'nuclear',
    severity: 'destructive',
    priority: 8,
    execute: execReloadData,
  },
  {
    type: 'contact_support',
    label: 'Contact Support',
    labelAr: 'تواصل مع الدعم',
    description: 'Send error report to support',
    descriptionAr: 'إرسال تقرير خطأ للدعم الفني',
    icon: 'mail-outline',
    severity: 'safe',
    priority: 9,
    execute: execContactSupport,
  },
  {
    type: 'restart_app',
    label: 'Restart App',
    labelAr: 'إعادة تشغيل التطبيق',
    description: 'Force restart the application',
    descriptionAr: 'إعادة تشغيل التطبيق',
    icon: 'exit-outline',
    severity: 'warning',
    priority: 10,
    execute: async () => {
      // On React Native, you can't truly restart — signal the user
      logger.info('[Recovery] Restart requested — user should manually restart', {}, 'RecoverySystem');
    },
  },
];

// ─── Public API ────────────────────────────────────────────────────────────

export function getRecoveryActions(context: RecoveryContext): RecoveryActionDefinition[] {
  return ALL_ACTIONS
    .filter(a => !a.isAvailable || a.isAvailable(context))
    .sort((a, b) => a.priority - b.priority);
}

export function getRecoveryAction(type: RecoveryActionType): RecoveryActionDefinition | undefined {
  return ALL_ACTIONS.find(a => a.type === type);
}

export function executeRecoveryAction(
  type: RecoveryActionType,
  context: RecoveryContext,
): Promise<void> {
  const action = getRecoveryAction(type);
  if (!action) {
    logger.warn(`[RecoveryRegistry] Unknown action type: ${type}`, {}, 'RecoverySystem');
    return Promise.resolve();
  }
  logger.info(`[RecoveryRegistry] Executing: ${type}`, { context: context.componentName }, 'RecoverySystem');
  return action.execute(context);
}

export function getAvailableSeverities(context: RecoveryContext): RecoveryStrategy[] {
  const actions = getRecoveryActions(context);
  const severities = new Set(actions.map(a => a.severity));
  return Array.from(severities);
}
