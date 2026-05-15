/**
 * SQLite Database Manager
 * Initializes expo-sqlite with proper PRAGMAs and schema loading
 */
import * as SQLite from 'expo-sqlite';
import { loadSchemaSQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Convert values to expo-sqlite compatible bindings.
 * undefined → null, booleans → 1/0, objects → JSON string.
 * All other primitives pass through unchanged.
 */
export function sanitizeBindings(params: unknown[]): (string | number | null)[] {
  return params.map(p => {
    if (p === undefined) return null;
    if (p === null) return null;
    if (typeof p === 'string') return p;
    if (typeof p === 'number') return p;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (typeof p === 'object') return JSON.stringify(p);
    return null;
  });
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('rafiq_local.db');

  // Centralized PRAGMAs — single source of truth
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA synchronous = NORMAL;');
  await db.execAsync('PRAGMA busy_timeout = 30000;');
  await db.execAsync('PRAGMA wal_autocheckpoint = 1000;');

  // Load schema using Expo-compatible method
  const schemaSQL = await loadSchemaSQL();
  await db.execAsync(schemaSQL);

  return db;
}

/**
 * Execute a parameterized SELECT query.
 * Returns array of typed results.
 */
export async function runQuery<T>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  const database = await getDatabase();
  const sanitizedParams = sanitizeBindings(params);
  const result = await database.getAllAsync<T>(sql, sanitizedParams);
  return result;
}

/**
 * Execute a statement (INSERT/UPDATE/DELETE).
 * Returns SQLiteRunResult with changes and lastInsertRowid.
 */
export async function runStatement(
  sql: string,
  params: (string | number | null)[] = []
): Promise<SQLite.SQLiteRunResult> {
  const database = await getDatabase();
  const sanitizedParams = sanitizeBindings(params);
  const result = await database.runAsync(sql, sanitizedParams);
  return result;
}

/**
 * Execute raw SQL without parameters (DDL, PRAGMA, etc.)
 */
export async function execSQL(sql: string): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(sql);
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
  }
}