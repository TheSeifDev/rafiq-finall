# Wearable Sync Flow

## Data Flow

```
Provider → Open Wearables API → RAFIQ Backend → Mobile App
                                                    │
                                                    ▼
                                            SQLite (WAL mode)
                                                    │
                                                    ▼
                                            Sync Queue
                                                    │
                                                    ▼
                                            Supabase
```

## Sync Lifecycle

### 1. Connection

1. User selects provider (e.g., Apple Health)
2. App opens OAuth flow in browser
3. User authenticates with provider
4. Authorization code returned to app
5. App sends code to RAFIQ backend
6. Backend exchanges code for tokens
7. Tokens stored in SQLite `wearable_connections`

### 2. Data Fetch

1. App calls `wearableService.syncProvider(provider)`
2. Service checks token expiration, refreshes if needed
3. Service fetches data from RAFIQ backend
4. Backend proxies to Open Wearables API
5. Data returned to mobile app

### 3. Validation & Normalization

1. `wearableIngestionService.validateAndNormalize()` processes each reading
2. Validates timestamp (within 1 year)
3. Rejects impossible values (HR < 30 or > 220, etc.)
4. Normalizes values to safe ranges
5. Returns `WearableVitalsInsert` DTO or null

### 4. Local Persistence

1. Validated vitals inserted to SQLite `wearable_vitals`
2. Record added to `wearable_sync_queue` for Supabase sync
3. Queue item contains:
   - Operation (insert/update/delete)
   - Entity type (wearable_vitals, etc.)
   - Entity ID
   - Serialized payload
   - Retry count (max 3)

### 5. Background Sync

1. App calls `wearableSyncService.processQueue()`
2. Fetches up to 50 pending items
3. For each item:
   - POSTs to `/api/sync/wearable`
   - On success: marks as 'completed'
   - On failure: increments attempts, updates error
4. Items with attempts >= max_attempts marked 'dead'

### 6. Offline Handling

- All data first stored locally in SQLite
- Queue survives airplane mode
- On reconnect: processQueue() runs automatically
- Manual retry via `retryFailedItems()`

## Code Flow

```typescript
// Sync a provider
const count = await wearableService.syncProvider('apple_health');

// Internal flow
await wearableService.syncProvider('apple_health')
  → check token expiration
  → refreshToken() if needed
  → fetchProviderData() via backend
  → for each reading:
      → wearableIngestionService.validateAndNormalize()
      → wearableRepository.insertVitals()
      → wearableSyncService.enqueueSync()
  → update last sync timestamp
```

## Queue Processing

```typescript
// Process queue manually (also runs on app foreground)
await wearableSyncService.processQueue(db);

// Check queue stats
const stats = await wearableSyncService.getQueueStats(db);
// { pending: 5, failed: 2, completed: 100, dead: 1 }

// Retry failed items
await wearableSyncService.retryFailedItems(db);
```

## Supabase Sync Contract

```typescript
interface SyncPayload {
  operation: 'insert' | 'update' | 'delete';
  entityType: 'wearable_vitals' | 'wearable_sleep_sessions' | 'wearable_activity_sessions';
  entityId: string;
  payload: WearableVitalsRow;
  userId: string;
}

// SQLite → Supabase mapping
interface WearableVitalsRow {
  id: string;
  user_id: string;
  patient_id: string | null;
  provider: string;
  heart_rate: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  oxygen_saturation: number | null;
  temperature: number | null;
  steps: number | null;
  sleep_seconds: number | null;
  recorded_at: string;
  synced_to_cloud: boolean;
  version: number;
  updated_at: string;
  updated_by_device: string;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
}
```

## Error Handling

| Error | Action |
|-------|--------|
| Token expired | Auto-refresh, retry once |
| Network error | Add to queue, retry later |
| Provider error | Log error, skip reading |
| Validation error | Reject reading, don't queue |
| Max retries | Mark as 'dead', alert user |

## Timestamps

All wearable data uses ISO 8601 format:
- `recorded_at` - When reading was taken
- `updated_at` - Last modification
- `last_sync` - Last successful sync to Supabase
- `connected_at` - When provider was linked