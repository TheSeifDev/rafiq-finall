/**
 * RAFIQ Centralized Logger
 * Production-grade logging with levels, formatting, persistence, and transport hooks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  source?: 'app' | 'notification' | 'wearable' | 'sync' | 'auth' | 'navigation';
  userId?: string;
  correlationId?: string;
  stack?: string;
}

export type LogTransport = (entry: LogEntry) => void | Promise<void>;

const STORAGE_KEY = 'rafiq_app_logs';
const MAX_STORED_LOGS = 200;
const MAX_LOGS_PER_FLUSH = 50;

let _minLevel: LogLevel = __DEV__ ? 'debug' : 'warn';
let _transports: LogTransport[] = [];
let _logBuffer: LogEntry[] = [];
let _isFlushing = false;

// ─── Level priority ─────────────────────────────────────────────

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

// ─── Configuration ───────────────────────────────────────────────

export function setLogLevel(level: LogLevel): void {
  _minLevel = level;
}

export function addLogTransport(transport: LogTransport): () => void {
  _transports.push(transport);
  return () => {
    const idx = _transports.indexOf(transport);
    if (idx !== -1) _transports.splice(idx, 1);
  };
}

export function addContext(data: Record<string, unknown>): void {
  _globalContext = { ..._globalContext, ...data };
}

let _globalContext: Record<string, unknown> = {};

export function clearContext(): void {
  _globalContext = {};
}

// ─── Core logging ──────────────────────────────────────────────

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[_minLevel];
}

function formatMessage(level: LogLevel, message: string, context?: string): string {
  const ts = new Date().toISOString();
  const ctx = context ? `[${context}]` : '';
  return `[${ts}][${level.toUpperCase()}]${ctx} ${message}`;
}

function captureStack(): string | undefined {
  try {
    throw new Error('log');
  } catch (e: unknown) {
    if (e instanceof Error && e.stack) {
      const lines = e.stack.split('\n').slice(3, 8);
      return lines.join('\n');
    }
    return undefined;
  }
}

function persistEntry(entry: LogEntry): void {
  _logBuffer.push(entry);
  if (_logBuffer.length > MAX_STORED_LOGS) {
    _logBuffer.shift();
  }
  scheduleFlush();
}

let _flushTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleFlush(): void {
  if (_flushTimer) return;
  _flushTimer = setTimeout(async () => {
    _flushTimer = null;
    await flushToStorage().catch(() => undefined);
  }, 2000);
}

async function flushToStorage(): Promise<void> {
  if (_logBuffer.length === 0 || _isFlushing) return;
  _isFlushing = true;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let existing: LogEntry[] = raw ? JSON.parse(raw) : [];
    const toAdd = _logBuffer.splice(0, MAX_LOGS_PER_FLUSH);
    existing = [...existing, ...toAdd].slice(-MAX_STORED_LOGS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // ignore storage errors
  } finally {
    _isFlushing = false;
  }
}

async function emit(entry: LogEntry): Promise<void> {
  // Persist to AsyncStorage
  persistEntry(entry);

  // Console output (always)
  const formatted = formatMessage(entry.level, entry.message, entry.context);
  const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  switch (entry.level) {
    case 'debug': console.debug(formatted + data); break;
    case 'info':  console.info(formatted + data); break;
    case 'warn':  console.warn(formatted + data, entry.stack ?? ''); break;
    case 'error': console.error(formatted + data, entry.stack ?? ''); break;
    case 'critical': console.error(`🚨 CRITICAL: ${formatted}`, data, entry.stack ?? ''); break;
  }

  // Transport hooks (async)
  for (const transport of _transports) {
    try {
      const result = transport(entry);
      if (result instanceof Promise) result.catch(() => undefined);
    } catch {
      // transport error — don't crash the logger
    }
  }
}

function createEntry(
  level: LogLevel,
  message: string,
  opts?: {
    context?: string;
    data?: Record<string, unknown>;
    source?: LogEntry['source'];
    userId?: string;
    correlationId?: string;
    stack?: boolean;
  },
): LogEntry {
  return {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    level,
    message,
    context: opts?.context,
    data: opts?.data ? { ..._globalContext, ...opts.data } : _globalContext ? { ..._globalContext } : undefined,
    source: opts?.source,
    userId: opts?.userId,
    correlationId: opts?.correlationId,
    stack: opts?.stack ? captureStack() : undefined,
  };
}

// ─── Public API ─────────────────────────────────────────────────

export const logger = {
  debug(message: string, data?: Record<string, unknown>, context?: string): void {
    if (!shouldLog('debug')) return;
    emit(createEntry('debug', message, { data, context, stack: false }));
  },

  info(message: string, data?: Record<string, unknown>, context?: string): void {
    if (!shouldLog('info')) return;
    emit(createEntry('info', message, { data, context, stack: false }));
  },

  warn(message: string, data?: Record<string, unknown>, context?: string): void {
    if (!shouldLog('warn')) return;
    emit(createEntry('warn', message, { data, context, stack: true }));
  },

  error(message: string, data?: Record<string, unknown>, context?: string): void {
    if (!shouldLog('error')) return;
    emit(createEntry('error', message, { data, context, stack: true }));
  },

  critical(message: string, data?: Record<string, unknown>, context?: string): void {
    if (!shouldLog('critical')) return;
    emit(createEntry('critical', message, { data, context, stack: true }));
  },

  // Convenience: named loggers per feature
  notification: {
    sent(id: string, category: string, severity: string): void {
      if (!shouldLog('debug')) return;
      emit(createEntry('info', `Notification sent: ${id}`, {
        context: 'Notifications',
        source: 'notification',
        data: { notificationId: id, category, severity },
      }));
    },
    failed(id: string, reason: string): void {
      emit(createEntry('error', `Notification failed: ${reason}`, {
        context: 'Notifications',
        source: 'notification',
        data: { notificationId: id, reason },
      }));
    },
  },

  wearable: {
    connected(name: string, deviceId: string): void {
      if (!shouldLog('info')) return;
      emit(createEntry('info', `Wearable connected: ${name}`, {
        context: 'Wearable',
        source: 'wearable',
        data: { deviceId, deviceName: name },
      }));
    },
    disconnected(deviceId: string, reason?: string): void {
      emit(createEntry('warn', `Wearable disconnected`, {
        context: 'Wearable',
        source: 'wearable',
        data: { deviceId, reason },
      }));
    },
    reading(vital: string, value: number, source: string): void {
      if (!shouldLog('debug')) return;
      emit(createEntry('debug', `Vitals reading: ${vital}=${value}`, {
        context: 'Wearable',
        source: 'wearable',
        data: { vital, value, source },
      }));
    },
  },

  sync: {
    started(table: string, direction: 'push' | 'pull'): void {
      if (!shouldLog('debug')) return;
      emit(createEntry('info', `Sync ${direction}: ${table}`, {
        context: 'Sync',
        source: 'sync',
        data: { table, direction },
      }));
    },
    completed(table: string, pushed: number, pulled: number, failed: number): void {
      if (failed > 0) {
        emit(createEntry('warn', `Sync completed with failures: ${table}`, {
          context: 'Sync',
          source: 'sync',
          data: { table, pushed, pulled, failed },
        }));
      } else {
        emit(createEntry('info', `Sync completed: ${table}`, {
          context: 'Sync',
          source: 'sync',
          data: { table, pushed, pulled },
        }));
      }
    },
  },

  auth: {
    login(userId: string): void {
      emit(createEntry('info', 'User logged in', {
        context: 'Auth',
        source: 'auth',
        userId,
        stack: false,
      }));
    },
    logout(userId: string): void {
      emit(createEntry('info', 'User logged out', {
        context: 'Auth',
        source: 'auth',
        userId,
        stack: false,
      }));
    },
    error(reason: string, userId?: string): void {
      emit(createEntry('error', `Auth error: ${reason}`, {
        context: 'Auth',
        source: 'auth',
        userId,
      }));
    },
  },

  // Flush any buffered logs
  async flush(): Promise<void> {
    await flushToStorage();
  },

  // Get stored logs (for debugging / crash reports)
  async getStoredLogs(): Promise<LogEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // Clear stored logs
  async clearLogs(): Promise<void> {
    _logBuffer = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

export default logger;