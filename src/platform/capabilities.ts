/**
 * Platform Capabilities Resolver
 *
 * Centralized platform capability detection for RAFIQ.
 * Provides feature gates based on:
 *   - Platform (iOS, Android, Expo Go, Dev)
 *   - Native module availability
 *   - Runtime permissions
 *   - Hardware features (BLE, sensors, etc.)
 *
 * Usage:
 *   const caps = getCapabilities();
 *   if (caps.canUseNativeBLE) { ... }
 *   if (!caps.isExpoGo) { ... }
 */
import Constants from 'expo-constants';

// ─── Capability Flags ────────────────────────────────────────────────────

export interface PlatformCapabilities {
  // Platform identity
  platform: 'ios' | 'android';
  isExpoGo: boolean;
  isDevBuild: boolean;
  isProduction: boolean;

  // BLE / Wearable
  canUseNativeBLE: boolean;
  canUseExpoBLE: boolean;

  // Sensors
  canAccessHealthKit: boolean;     // iOS HealthKit
  canAccessGoogleFit: boolean;      // Android Health Connect
  canUseAccelerometer: boolean;
  canUsePedometer: boolean;

  // Notifications
  canSendPushNotifications: boolean;
  canUseScheduledNotifications: boolean;
  canUseEmergencyFullScreen: boolean; // Android full-screen intent

  // Storage
  canUseMMKV: boolean;
  storageStrategy: 'mmkv' | 'asyncstorage' | 'fallback';

  // Location
  canUseBackgroundLocation: boolean;
  canUseForegroundLocation: boolean;

  // Camera / Media
  canUseCamera: boolean;
  canUseImagePicker: boolean;

  // Realtime / Network
  canUseSupabaseRealtime: boolean;
  canUseWebSockets: boolean;

  // Audio
  canPlayAudio: boolean;
  canUseSpeechRecognition: boolean;

  // UI capabilities
  supportsHaptics: boolean;
  supportsSafeArea: boolean;
  supportsStatusBar: boolean;

  // Feature flags (user-configurable)
  features: {
    wearableEnabled: boolean;
    emergencyEnabled: boolean;
    chatEnabled: boolean;
    foodAnalysisEnabled: boolean;
    aiInsightsEnabled: boolean;
  };

  // Runtime limits
  maxCacheAge: number;          // ms
  maxQueueRetries: number;
  syncTimeout: number;           // ms

  // Build info
  appVersion: string;
  sdkVersion: string;
  osVersion: string;
}

let cachedCapabilities: PlatformCapabilities | null = null;

// ─── Detection Logic ──────────────────────────────────────────────────────

async function detectCapabilities(): Promise<PlatformCapabilities> {
  const IS_EXPO_GO = Constants.appOwnership === 'expo';
  const IS_DEV = __DEV__;
  const IS_PROD = !IS_DEV;
  const platform = Constants.platform?.ios ? 'ios' : 'android';

  // ── BLE ──
  const canUseNativeBLE = !IS_EXPO_GO;
  const canUseExpoBLE = true; // Expo BLE works in Expo Go (limited)

  // ── Sensors ──
  let canAccessHealthKit = false;
  let canAccessGoogleFit = false;
  let canUseAccelerometer = true;
  let canUsePedometer = true;

  // ── Notifications ──
  const canSendPushNotifications = !IS_EXPO_GO;
  const canUseScheduledNotifications = true;
  const canUseEmergencyFullScreen = platform === 'android';

  // ── Storage ──
  // MMKV requires native build — default to asyncstorage for Expo Go
  let storageStrategy: PlatformCapabilities['storageStrategy'] = 'asyncstorage';

  // ── Location ──
  const canUseBackgroundLocation = platform === 'android' && !IS_EXPO_GO;
  const canUseForegroundLocation = true;

  // ── Camera ──
  const canUseCamera = true;
  const canUseImagePicker = true;

  // ── Network ──
  const canUseSupabaseRealtime = true;
  const canUseWebSockets = true;

  // ── Audio ──
  const canPlayAudio = true;
  const canUseSpeechRecognition = false; // Not yet implemented

  // ── UI ──
  const supportsHaptics = platform === 'ios';
  const supportsSafeArea = true;
  const supportsStatusBar = true;

  // ── Feature flags (can be overridden by user prefs) ──
  const features: PlatformCapabilities['features'] = {
    wearableEnabled: canUseNativeBLE || canUseExpoBLE,
    emergencyEnabled: true,
    chatEnabled: true,
    foodAnalysisEnabled: true,
    aiInsightsEnabled: true,
  };

  // ── Runtime limits ──
  const maxCacheAge = IS_EXPO_GO ? 5 * 60 * 1000 : 30 * 60 * 1000;
  const maxQueueRetries = IS_EXPO_GO ? 3 : 5;
  const syncTimeout = IS_EXPO_GO ? 10_000 : 30_000;

  return {
    platform,
    isExpoGo: IS_EXPO_GO,
    isDevBuild: IS_DEV,
    isProduction: IS_PROD,
    canUseNativeBLE,
    canUseExpoBLE,
    canAccessHealthKit,
    canAccessGoogleFit,
    canUseAccelerometer,
    canUsePedometer,
    canSendPushNotifications,
    canUseScheduledNotifications,
    canUseEmergencyFullScreen,
    storageStrategy,
    canUseMMKV: false, // requires native build
    canUseBackgroundLocation,
    canUseForegroundLocation,
    canUseCamera,
    canUseImagePicker,
    canUseSupabaseRealtime,
    canUseWebSockets,
    canPlayAudio,
    canUseSpeechRecognition,
    supportsHaptics,
    supportsSafeArea,
    supportsStatusBar,
    features,
    maxCacheAge,
    maxQueueRetries,
    syncTimeout,
    appVersion: (() => { try { return require('../../package.json').version; } catch { return '0.0.0'; } })(),
    sdkVersion: Constants.expoVersion ?? 'unknown',
    osVersion: Constants.platform?.ios ? `${Constants.platform.ios}` : `${Constants.platform?.android}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getCapabilities(): Promise<PlatformCapabilities> {
  if (!cachedCapabilities) {
    cachedCapabilities = await detectCapabilities();
  }
  return cachedCapabilities;
}

export function getCachedCapabilities(): PlatformCapabilities | null {
  return cachedCapabilities;
}

export function isCapabilityAvailable(cap: keyof PlatformCapabilities): boolean {
  if (!cachedCapabilities) return false;
  const val = cachedCapabilities[cap];
  return typeof val === 'boolean' ? val : false;
}

// ─── Feature gate helpers ─────────────────────────────────────────────────

export function canUseNativeWearable(): boolean {
  return cachedCapabilities?.canUseNativeBLE ?? false;
}

export function mustUseSimulatedWearable(): boolean {
  return cachedCapabilities?.isExpoGo ?? false;
}

export function shouldUseMMKV(): boolean {
  return cachedCapabilities?.storageStrategy === 'mmkv';
}

export function getStorageStrategy(): PlatformCapabilities['storageStrategy'] {
  return cachedCapabilities?.storageStrategy ?? 'asyncstorage';
}

export function getSyncTimeout(): number {
  return cachedCapabilities?.syncTimeout ?? 30_000;
}

export function isProductionBuild(): boolean {
  return cachedCapabilities?.isProduction ?? false;
}

// ─── Capability string (for debugging) ───────────────────────────────────

export function getCapabilityReport(): string {
  if (!cachedCapabilities) return 'Capabilities not initialized';
  const c = cachedCapabilities;
  return [
    `Platform: ${c.platform} | Expo Go: ${c.isExpoGo} | Production: ${c.isProduction}`,
    `BLE: native=${c.canUseNativeBLE} expo=${c.canUseExpoBLE}`,
    `Storage: ${c.storageStrategy} (mmkv=${c.canUseMMKV})`,
    `Push: ${c.canSendPushNotifications} | Emergency FS: ${c.canUseEmergencyFullScreen}`,
    `Health: HK=${c.canAccessHealthKit} GC=${c.canAccessGoogleFit}`,
    `Sync timeout: ${c.syncTimeout}ms | Cache max: ${c.maxCacheAge}ms`,
    `Version: ${c.appVersion} | SDK: ${c.sdkVersion}`,
  ].join('\n');
}
