/**
 * Enhanced Notification Service — Production Ready
 * Integrates with notificationPipeline for instant delivery
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { deleteLocal, listWhere, updateLocal, upsertLocal } from '../local/repository';
import { localSyncEngine } from '../local/syncEngine';
import {
  NotificationCategory,
  enqueueNotification,
  subscribeToNotifications,
  notifyEmergency,
  notifyHealth,
  notifyMedication,
  notifyDevice,
  notifyWearable,
  notifyGasAlert,
  notifyFallDetection,
  notifyWearableDisconnect,
  notifyAIWarning,
  notifyFoodAlert,
} from '../lib/notifications/notificationPipeline';

// ─── Types ──────────────────────────────────────────────────────

export type NotificationCategoryType = NotificationCategory;

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string | null;
  category: NotificationCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  is_pinned: boolean;
  data: Record<string, unknown> | null;
  screen: string | null;
  source: 'local' | 'backend' | 'wearable' | 'ai' | 'system';
  created_at: string;
}

// ─── Service ────────────────────────────────────────────────────

export const notificationService = {
  // ── Fetch notifications with full schema
  async getNotifications(userId: string): Promise<AppNotification[]> {
    const local = await listWhere<Record<string, unknown>>(
      'notifications',
      'user_id = ?',
      [userId],
      'created_at DESC LIMIT 500',
    );
    if (local.length > 0) return local as unknown as AppNotification[];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);
    for (const notification of data ?? []) {
      await upsertLocal('notifications', notification as Record<string, unknown>, { enqueue: false, userId });
    }
    return (data ?? []) as AppNotification[];
  },

  // ── Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  // ── Get notifications by category
  async getByCategory(userId: string, category: NotificationCategory): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return (data ?? []) as AppNotification[];
  },

  // ── Get emergency/critical notifications
  async getEmergencyAlerts(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('severity', 'critical')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data ?? []) as AppNotification[];
  },

  // ── Create notification via pipeline (instant delivery)
  async createNotification(payload: {
    user_id: string;
    title: string;
    body: string;
    type?: string | null;
    category?: NotificationCategory;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    data?: Record<string, unknown>;
    screen?: string;
    source?: 'local' | 'backend' | 'wearable' | 'ai' | 'system';
  }): Promise<string> {
    return enqueueNotification({
      user_id: payload.user_id,
      title: payload.title,
      body: payload.body,
      type: payload.type ?? 'general',
      category: payload.category ?? 'system',
      severity: payload.severity ?? 'medium',
      data: payload.data,
      screen: payload.screen ?? 'NotificationCenter',
      source: payload.source ?? 'local',
    });
  },

  // ── Mark as read
  async markAsRead(id: string): Promise<void> {
    await updateLocal('notifications', id, { is_read: true, read_at: new Date().toISOString() }, { priority: 'normal' });
  },

  // ── Mark all as read
  async markAllRead(userId: string): Promise<void> {
    const rows = await listWhere<Record<string, unknown>>('notifications', 'user_id = ? AND is_read = 0', [userId]);
    for (const row of rows) {
      await updateLocal('notifications', String(row.id), { is_read: true, read_at: new Date().toISOString() }, { userId });
    }
  },

  // ── Pin notification (emergency)
  async pinNotification(id: string): Promise<void> {
    await updateLocal('notifications', id, { is_pinned: true }, { priority: 'high' });
  },

  // ── Delete notification
  async deleteNotification(id: string): Promise<void> {
    await deleteLocal('notifications', id, { hard: true, priority: 'normal' });
  },

  // ── Delete multiple
  async deleteNotifications(ids: string[]): Promise<void> {
    for (const id of ids) await this.deleteNotification(id);
  },

  // ── Search notifications
  async searchNotifications(userId: string, query: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return (data ?? []) as AppNotification[];
  },

  // ── Subscribe to realtime (returns cleanup function)
  subscribe(userId: string, onInsert: (notification: AppNotification) => void): () => void {
    return subscribeToNotifications(userId, async (notification) => {
      await upsertLocal('notifications', notification as Record<string, unknown>, { enqueue: false, userId });
      await localSyncEngine.recordRealtimeEvent({
        userId,
        tableName: 'notifications',
        recordId: notification.id,
        eventType: 'INSERT',
        payload: notification as unknown as Record<string, unknown>,
      });
      onInsert(notification);
    });
  },

  // ── Backward-compatible aliases
  async getAll(userId: string): Promise<AppNotification[]> {
    return this.getNotifications(userId);
  },

  async markRead(id: string): Promise<void> {
    return this.markAsRead(id);
  },

  // ── Convenience notification methods
  async notifyEmergency(params: { userId: string; title: string; body: string; data?: Record<string, unknown> }): Promise<string> {
    return notifyEmergency(params);
  },

  async notifyHealthAlert(params: { userId: string; title: string; body: string; severity?: 'low' | 'medium' | 'high'; data?: Record<string, unknown> }): Promise<string> {
    return notifyHealth(params);
  },

  async notifyMedicationReminder(params: { userId: string; title: string; body: string; medicationId?: string }): Promise<string> {
    return notifyMedication(params);
  },

  async notifyDeviceAlert(params: { userId: string; title: string; body: string; deviceId?: string }): Promise<string> {
    return notifyDevice(params);
  },

  async notifyWearableData(params: { userId: string; title: string; body: string; vitalType?: string; value?: string }): Promise<string> {
    return notifyWearable(params);
  },

  async notifyGas(params: { userId: string; title: string; body: string; level?: string; location?: string }): Promise<string> {
    return notifyGasAlert(params);
  },

  async notifyFall(params: { userId: string; title: string; body: string; location?: string }): Promise<string> {
    return notifyFallDetection(params);
  },

  async notifyWearableDisconnect(params: { userId: string; deviceName?: string }): Promise<string> {
    return notifyWearableDisconnect(params);
  },

  async notifyAI(params: { userId: string; title: string; body: string; insightType?: string }): Promise<string> {
    return notifyAIWarning(params);
  },

  async notifyFood(params: { userId: string; title: string; body: string; foodName?: string; reason?: string }): Promise<string> {
    return notifyFoodAlert(params);
  },
};

export default notificationService;
