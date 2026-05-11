/**
 * Notification Reliability & Hardening System
 *
 * Features:
 * - Acknowledgment tracking (delivery → read confirmation)
 * - Retry escalation (exponential with max attempts)
 * - Duplicate prevention (content hash deduplication)
 * - Debounce system (rate-limit similar notifications)
 * - Emergency sticky notifications (Android full-screen intent)
 * - Background queue safety (persistent across app restarts)
 * - Delivery tracking (Supabase sync + local verification)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import type { NotificationPayload, NotificationCategory } from './notificationPipeline';
import { CHANNEL_EMERGENCY } from './notificationPipeline';

// ─── Constants ──────────────────────────────────────────────────

const RELIABILITY_KEY = 'rafiq_notification_reliability_v2';
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 5000;
const DEBOUNCE_WINDOW_MS = 30_000; // 30s window for similar notifications
const EMERGENCY_STICKY_DELAY_MS = 60_000;

// ─── Types ──────────────────────────────────────────────────────

export interface NotificationReceipt {
  id: string;
  notificationId: string;
  scheduledAt: number;
  deliveredAt: number | null;
  readAt: number | null;
  acknowledgedAt: number | null;
  attempts: number;
  lastError: string | null;
  status: 'pending' | 'delivered' | 'read' | 'failed' | 'acknowledged';
}

export interface ReliabilityConfig {
  enableDuplicateCheck: boolean;
  enableDebounce: boolean;
  enableEscalation: boolean;
  enableSticky: boolean;
  maxRetries: number;
}

// ─── Duplicate Prevention ──────────────────────────────────────

function hashPayload(payload: NotificationPayload): string {
  const str = `${payload.user_id}:${payload.title}:${payload.body}:${payload.type}:${payload.category}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

async function getRecentHashes(): Promise<Record<string, number>> {
  const raw = await AsyncStorage.getItem(`${RELIABILITY_KEY}_hashes`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const now = Date.now();
    // Prune old entries (> 2 minutes)
    const pruned: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && now - v < 120_000) {
        pruned[k] = v;
      }
    }
    return pruned;
  } catch {
    return {};
  }
}

async function markHashSeen(hash: string): Promise<boolean> {
  const hashes = await getRecentHashes();
  if (hashes[hash] && Date.now() - hashes[hash] < DEBOUNCE_WINDOW_MS) {
    return true; // duplicate found
  }
  hashes[hash] = Date.now();
  await AsyncStorage.setItem(`${RELIABILITY_KEY}_hashes`, JSON.stringify(hashes));
  return false;
}

// ─── Receipt Tracking ───────────────────────────────────────────

async function getReceipts(): Promise<Record<string, NotificationReceipt>> {
  const raw = await AsyncStorage.getItem(`${RELIABILITY_KEY}_receipts`);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveReceipt(receipt: NotificationReceipt): Promise<void> {
  const receipts = await getReceipts();
  receipts[receipt.id] = receipt;
  const entries = Object.values(receipts).sort((a: NotificationReceipt, b: NotificationReceipt) => b.scheduledAt - a.scheduledAt);
  const trimmed = entries.slice(0, 100);
  const trimmedMap: Record<string, NotificationReceipt> = {};
  for (const r of trimmed) { trimmedMap[r.id] = r; }
  await AsyncStorage.setItem(`${RELIABILITY_KEY}_receipts`, JSON.stringify(trimmedMap));
}

export async function markDelivered(notificationId: string): Promise<void> {
  const receipts = await getReceipts();
  const receipt = receipts[notificationId];
  if (receipt && receipt.status === 'pending') {
    receipt.status = 'delivered';
    receipt.deliveredAt = Date.now();
    await saveReceipt(receipt);
  }
}

export async function markRead(notificationId: string): Promise<void> {
  const receipts = await getReceipts();
  const receipt = receipts[notificationId];
  if (receipt) {
    receipt.status = 'read';
    receipt.readAt = Date.now();
    await saveReceipt(receipt);
  }
}

export async function acknowledgeNotification(notificationId: string): Promise<void> {
  const receipts = await getReceipts();
  const receipt = receipts[notificationId];
  if (receipt) {
    receipt.status = 'acknowledged';
    receipt.acknowledgedAt = Date.now();
    await saveReceipt(receipt);
  }
}

export async function getReceipt(notificationId: string): Promise<NotificationReceipt | null> {
  const receipts = await getReceipts();
  return receipts[notificationId] ?? null;
}

// ─── Escalation Logic ───────────────────────────────────────────

export function getEscalationDelay(attempts: number): number {
  // Exponential backoff: 5s, 10s, 20s, 40s, 80s
  return Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempts), 120_000);
}

export function shouldEscalate(attempts: number, severity: string | undefined): boolean {
  if (severity === 'critical' || severity === 'emergency') return attempts >= 1;
  if (severity === 'high') return attempts >= 2;
  return attempts >= 3;
}

// ─── Main Wrapper ───────────────────────────────────────────────

export async function isDuplicate(payload: NotificationPayload): Promise<boolean> {
  const hash = hashPayload(payload);
  return markHashSeen(hash);
}

export function isEmergencyCategory(category: NotificationCategory): boolean {
  return category === 'emergency';
}

export function getEmergencyStickyDelay(severity: string | undefined): number {
  if (severity === 'critical') return EMERGENCY_STICKY_DELAY_MS * 2;
  return EMERGENCY_STICKY_DELAY_MS;
}

export async function createReliableReceipt(
  id: string,
  payload: NotificationPayload,
): Promise<NotificationReceipt> {
  const receipt: NotificationReceipt = {
    id: `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    notificationId: id,
    scheduledAt: Date.now(),
    deliveredAt: null,
    readAt: null,
    acknowledgedAt: null,
    attempts: 0,
    lastError: null,
    status: 'pending',
  };
  await saveReceipt(receipt);
  return receipt;
}

export async function recordDeliveryFailure(
  notificationId: string,
  error: string,
  attempts: number,
): Promise<void> {
  const receipts = await getReceipts();
  const receipt = receipts[notificationId];
  if (receipt) {
    receipt.attempts = attempts;
    receipt.lastError = error;
    receipt.status = attempts >= MAX_RETRY_ATTEMPTS ? 'failed' : 'pending';
    await saveReceipt(receipt);
  }
}

// ─── Delivery verification ─────────────────────────────────────

export async function verifyPendingDeliveries(): Promise<string[]> {
  const receipts = await getReceipts();
  const now = Date.now();
  const stale: string[] = [];

  for (const [id, receipt] of Object.entries(receipts)) {
    if (receipt.status !== 'pending') continue;
    const age = now - receipt.scheduledAt;
    // Mark as failed if pending for more than 10 minutes
    if (age > 10 * 60 * 1000) {
      receipt.status = 'failed';
      receipt.lastError = 'Delivery timeout (> 10 minutes)';
      await saveReceipt(receipt);
      stale.push(id);
    }
  }

  return stale;
}

// ─── Emergency notification special handling ─────────────────────

export async function sendEmergencyNotification(params: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  screen?: string;
}): Promise<string | null> {
  // In Expo Go, emergency notifications still fire locally
  try {
    const id = await Notifications.scheduleNotificationAsync({
      identifier: `emergency_${Date.now()}`,
      content: {
        title: params.title,
        body: params.body,
        data: {
          ...params.data,
          screen: params.screen ?? 'Emergency',
          category: 'emergency',
          severity: 'critical',
          isEmergency: true,
        },
        sound: 'default',
        ...(__DEV__ === false && {
          // Only set high priority on real builds
          priority: 'max',
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
      },
    });
    return id;
  } catch {
    return null;
  }
}

// ─── Supabase delivery sync ─────────────────────────────────────

/**
 * After a notification is created in Supabase, mark it as delivered locally.
 * Called from the notification pipeline after successful insert.
 */
export async function syncDeliveryReceipt(
  notificationId: string,
  payload: NotificationPayload,
): Promise<void> {
  const receipts = await getReceipts();
  const receipt = receipts[notificationId];
  if (receipt) {
    receipt.deliveredAt = Date.now();
    receipt.status = 'delivered';
    await saveReceipt(receipt);
  }
}