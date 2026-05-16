/**
 * Wearable Sync Service — Offline Queue & Supabase Sync
 */

import * as SQLite from 'expo-sqlite';
import type { WearableSyncQueueInsert } from '../../types/wearable';
import { generateId } from '../../lib/database/helpers';

class WearableSyncService {
  async enqueueSync(
    db: SQLite.SQLiteDatabase,
    userId: string,
    operation: 'insert' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const id = generateId();
    const now = new Date().toISOString();

    const queueItem: WearableSyncQueueInsert = {
      id,
      user_id: userId,
      payload: JSON.stringify(payload),
      operation,
      entity_type: entityType,
      entity_id: entityId,
      attempts: 0,
      max_attempts: 3,
      last_attempt: null,
      status: 'pending',
      error_message: null,
      created_at: now,
      processed_at: null,
    };

    await this.insertQueueItem(db, queueItem);
  }

  private async insertQueueItem(
    db: SQLite.SQLiteDatabase,
    item: WearableSyncQueueInsert
  ): Promise<void> {
    const sql = `
      INSERT INTO wearable_sync_queue (
        id, user_id, payload, operation, entity_type, entity_id,
        attempts, max_attempts, last_attempt, status, error_message,
        created_at, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const bindings = sanitizeBindings([
      item.id,
      item.user_id,
      item.payload,
      item.operation,
      item.entity_type,
      item.entity_id,
      item.attempts,
      item.max_attempts,
      item.last_attempt,
      item.status,
      item.error_message,
      item.created_at,
      item.processed_at,
    ]);

    await (db as any).execAsync(sql, bindings);
  }

  async processQueue(db: SQLite.SQLiteDatabase): Promise<number> {
    const pendingItems = await this.getPendingItems(db);

    let processedCount = 0;

    for (const item of pendingItems) {
      try {
        await this.processItem(db, item);
        await this.markProcessed(db, item.id);
        processedCount++;
      } catch (error) {
        await this.markFailed(db, item.id, error instanceof Error ? error.message : 'Unknown error');

        if (item.attempts + 1 >= item.max_attempts) {
          await this.markDead(db, item.id);
        }
      }
    }

    return processedCount;
  }

  private async processItem(
    db: SQLite.SQLiteDatabase,
    item: WearableSyncQueueInsert
  ): Promise<void> {
    // Call Supabase via backend
    const endpoint = `${process.env.EXPO_PUBLIC_API_URL || ''}/api/sync/wearable`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: item.operation,
        entityType: item.entity_type,
        entityId: item.entity_id,
        payload: JSON.parse(item.payload),
        userId: item.user_id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
  }

  private async getPendingItems(
    db: SQLite.SQLiteDatabase
  ): Promise<WearableSyncQueueInsert[]> {
    const result = await db.getAllAsync<WearableSyncQueueInsert>(
      `SELECT * FROM wearable_sync_queue
       WHERE status = 'pending'
       AND attempts < max_attempts
       ORDER BY created_at ASC
       LIMIT 50`
    );

    return result;
  }

  private async markProcessed(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    const now = new Date().toISOString();
    await (db as any).execAsync(
      `UPDATE wearable_sync_queue SET status = 'completed', processed_at = ? WHERE id = ?`,
      [now, id]
    );
  }

  private async markFailed(db: SQLite.SQLiteDatabase, id: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    await (db as any).execAsync(
      `UPDATE wearable_sync_queue
       SET status = 'pending', attempts = attempts + 1, last_attempt = ?, error_message = ?
       WHERE id = ?`,
      [now, error, id]
    );
  }

  private async markDead(db: SQLite.SQLiteDatabase, id: string): Promise<void> {
    await (db as any).execAsync(
      `UPDATE wearable_sync_queue SET status = 'dead' WHERE id = ?`,
      [id]
    );
  }

  async getQueueStats(db: SQLite.SQLiteDatabase): Promise<{
    pending: number;
    failed: number;
    completed: number;
    dead: number;
  }> {
    const stats = await db.getAllAsync<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM wearable_sync_queue GROUP BY status`
    );

    const result = { pending: 0, failed: 0, completed: 0, dead: 0 };

    stats.forEach((s) => {
      if (s.status === 'pending') result.pending = s.count;
      else if (s.status === 'failed') result.failed = s.count;
      else if (s.status === 'completed') result.completed = s.count;
      else if (s.status === 'dead') result.dead = s.count;
    });

    return result;
  }

  async retryFailedItems(db: SQLite.SQLiteDatabase): Promise<number> {
    await (db as any).execAsync(
      `UPDATE wearable_sync_queue SET status = 'pending', attempts = 0 WHERE status = 'failed'`
    );

    return this.processQueue(db);
  }
}

function sanitizeBindings(args: (string | number | null | undefined)[]): (string | number | null)[] {
  return args.map((arg) => {
    if (arg === undefined) return null;
    if (typeof arg === 'string' && arg.trim() === '') return null;
    return arg;
  });
}

export const wearableSyncService = new WearableSyncService();