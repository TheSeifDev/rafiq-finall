/**
 * Wearable Service — Real Open Wearables Integration
 * Connects to Apple Health, Health Connect, Samsung Health, Garmin, Fitbit, Oura, Polar, Suunto
 */

import * as SQLite from 'expo-sqlite';
import { generateId } from '../../lib/database/helpers';
import { wearableRepository } from '../../repositories/WearableRepository';
import { wearableSyncService } from './wearableSync.service';
import { wearableIngestionService } from './wearableIngestion.service';
import type {
  WearableProvider,
  WearableConnection,
  WearableVitals,
  WearableSyncStatus,
  WearableConnectionInsert,
  WearableVitalsInsert,
} from '../../types/wearable';
import { sanitizeBindings, getDeviceId } from '../../lib/database/helpers';

class WearableService {
  private db: SQLite.SQLiteDatabase | null = null;
  private activeConnections: Map<WearableProvider, WearableConnection> = new Map();

  async initialize(db: SQLite.SQLiteDatabase): Promise<void> {
    this.db = db;
    await this.loadActiveConnections();
  }

  private async loadActiveConnections(): Promise<void> {
    if (!this.db) return;

    const connections = await wearableRepository.getActiveConnections(this.db);
    connections.forEach((conn) => {
      this.activeConnections.set(conn.provider as WearableProvider, conn);
    });
  }

  async getProviders(): Promise<WearableProvider[]> {
    return [
      'apple_health',
      'health_connect',
      'samsung_health',
      'garmin',
      'fitbit',
      'oura',
      'polar',
      'suunto',
    ];
  }

  async connect(
    provider: WearableProvider,
    authCode: string,
    userId: string
  ): Promise<WearableConnection> {
    if (!this.db) throw new Error('Database not initialized');

    // Exchange auth code for tokens via backend (NEVER store secrets in app)
    const tokenResponse = await this.exchangeAuthCode(provider, authCode);

    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    const connection: WearableConnectionInsert = {
      id: generateId(),
      user_id: userId,
      provider: provider,
      provider_device_id: tokenResponse.deviceId || null,
      access_token: tokenResponse.accessToken,
      refresh_token: tokenResponse.refreshToken,
      expires_at: tokenResponse.expiresAt,
      connected_at: now,
      last_sync: null,
      is_active: 1,
      version: 1,
      updated_at: now,
      updated_by_device: deviceId,
      is_deleted: 0,
      deleted_at: null,
      deleted_by: null,
    };

    await wearableRepository.insertConnection(this.db, connection);

    const savedConnection: WearableConnection = {
      id: connection.id,
      userId: connection.user_id,
      provider: connection.provider as WearableProvider,
      providerDeviceId: connection.provider_device_id,
      accessToken: connection.access_token,
      refreshToken: connection.refresh_token,
      expiresAt: connection.expires_at,
      connectedAt: connection.connected_at,
      lastSyncAt: connection.last_sync,
      isActive: true,
      version: connection.version,
      updatedAt: connection.updated_at,
      updatedByDevice: connection.updated_by_device,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    };

    this.activeConnections.set(provider, savedConnection);

    return savedConnection;
  }

  private async exchangeAuthCode(
    provider: WearableProvider,
    authCode: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
    deviceId: string;
  }> {
    // Call RAFIQ backend to exchange auth code for tokens
    // Backend calls Open Wearables API with secret keys
    // NEVER expose secrets in mobile app

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || ''}/api/wearable/auth/exchange`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          authCode,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Auth exchange failed: ${response.status}`);
    }

    return response.json();
  }

  async disconnect(provider: WearableProvider, userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const connection = this.activeConnections.get(provider);
    if (!connection) return;

    const deviceId = await getDeviceId();
    const now = new Date().toISOString();

    await wearableRepository.markConnectionDeleted(this.db, connection.id, deviceId, now);

    this.activeConnections.delete(provider);
  }

  async getConnection(provider: WearableProvider): Promise<WearableConnection | null> {
    return this.activeConnections.get(provider) || null;
  }

  async getActiveConnections(): Promise<WearableConnection[]> {
    return Array.from(this.activeConnections.values());
  }

  async syncProvider(provider: WearableProvider): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const connection = this.activeConnections.get(provider);
    if (!connection || !connection.accessToken) {
      throw new Error(`No active connection for provider: ${provider}`);
    }

    // Refresh token if needed
    let accessToken = connection.accessToken;
    if (connection.expiresAt && new Date(connection.expiresAt) <= new Date()) {
      accessToken = await this.refreshToken(provider, connection.refreshToken!);
    }

    // Fetch data from provider via backend
    const vitalsData = await this.fetchProviderData(provider, accessToken);

    // Ingest and persist
    let persistedCount = 0;
    for (const data of vitalsData) {
      // Ensure timestamp exists before validation
      const normalized = { timestamp: new Date().toISOString(), ...data };
      const validated = wearableIngestionService.validateAndNormalize(normalized as any, provider);
      if (validated) {
        await this.persistVitals(validated, connection.userId);
        persistedCount++;
      }
    }

    // Update last sync
    const now = new Date().toISOString();
    await wearableRepository.updateLastSync(this.db, connection.id, now);

    // Update connection in memory
    this.activeConnections.set(provider, {
      ...connection,
      lastSyncAt: now,
    });

    return persistedCount;
  }

  private async fetchProviderData(
    provider: WearableProvider,
    accessToken: string
  ): Promise<Record<string, unknown>[]> {
    // Call RAFIQ backend which proxies to Open Wearables
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || ''}/api/wearable/data/${provider}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch provider data: ${response.status}`);
    }

    const data = await response.json();
    return data.readings || [];
  }

  private async refreshToken(
    provider: WearableProvider,
    refreshToken: string
  ): Promise<string> {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL || ''}/api/wearable/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          refreshToken,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return data.accessToken;
  }

  private async persistVitals(
    vitals: WearableVitalsInsert,
    userId: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Insert vitals to SQLite
    await wearableRepository.insertVitals(this.db, vitals);

    // Add to sync queue for Supabase
    await wearableSyncService.enqueueSync(this.db, userId, 'insert', 'wearable_vitals', vitals.id, vitals as unknown as Record<string, unknown>);
  }

  async getVitals(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<WearableVitals[]> {
    if (!this.db) throw new Error('Database not initialized');
    return wearableRepository.getVitals(this.db, userId, startDate, endDate);
  }

  async getLatestVitals(userId: string): Promise<WearableVitals | null> {
    if (!this.db) throw new Error('Database not initialized');
    return wearableRepository.getLatestVitals(this.db, userId);
  }

  async getSyncStatus(userId: string): Promise<WearableSyncStatus[]> {
    if (!this.db) return [];

    const connections = await wearableRepository.getConnectionsByUser(this.db, userId);
    const statuses: WearableSyncStatus[] = [];

    for (const conn of connections) {
      const vitals = await wearableRepository.getVitalsCount(this.db, conn.userId, conn.provider);
      statuses.push({
        provider: conn.provider as WearableProvider,
        lastSyncAt: conn.lastSyncAt,
        status: conn.isActive ? 'connected' : 'disconnected',
        recordCount: vitals,
        errorMessage: null,
      });
    }

    return statuses;
  }

  async isProviderConnected(provider: WearableProvider): Promise<boolean> {
    return this.activeConnections.has(provider);
  }
}

export const wearableService = new WearableService();