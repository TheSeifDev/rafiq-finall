export type RafiqUuid = string;

export type SyncOperation = 'insert' | 'update' | 'upsert' | 'delete';
export type SyncPriority = 'low' | 'normal' | 'high' | 'critical';
export type SyncStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface PendingSyncRecord {
  id: RafiqUuid;
  user_id: RafiqUuid | null;
  device_id: RafiqUuid | null;
  table_name: string;
  record_id: RafiqUuid;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  idempotency_key: string;
  priority: SyncPriority;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string;
  last_error: string | null;
  status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface FailedSyncRecord {
  id: RafiqUuid;
  pending_sync_id: RafiqUuid | null;
  user_id: RafiqUuid | null;
  device_id: RafiqUuid | null;
  table_name: string;
  record_id: RafiqUuid | null;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  error_code: string | null;
  error_message: string;
  attempts: number;
  failed_at: string;
  resolved_at: string | null;
  resolution: string | null;
}

export interface SyncLogRecord {
  id: RafiqUuid;
  user_id: RafiqUuid | null;
  device_id: RafiqUuid | null;
  direction: 'push' | 'pull' | 'realtime' | 'repair';
  table_name: string | null;
  record_id: RafiqUuid | null;
  status: 'started' | 'success' | 'partial' | 'failed';
  pushed: number;
  pulled: number;
  failed: number;
  details: Record<string, unknown>;
  created_at: string;
}

export interface RealtimeEventRecord {
  id: RafiqUuid;
  user_id: RafiqUuid | null;
  patient_id: RafiqUuid | null;
  table_name: string;
  record_id: RafiqUuid | null;
  event_type: 'INSERT' | 'UPDATE' | 'DELETE' | 'BROADCAST';
  payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}
