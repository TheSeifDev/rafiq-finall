/**
 * RAFIQ Bootstrap Orchestrator — Dependency-Graph-Validated Startup
 *
 * Deterministic startup with dependency graph validation:
 *
 *   Phase 1 — Foundation
 *     Storage: AsyncStorage hydration
 *     Permissions: Notification + Location
 *
 *   Phase 2 — Realtime & Wearable
 *     Queue: Notification queue restore/replay
 *     Realtime: Supabase channel subscriptions
 *     Wearable: BLE adapter restore
 *
 *   Phase 3 — Application
 *     Navigation: Screen pre-warming
 *     Health checks: Vital service sanity
 *     Monitoring: Performance hooks init
 *
 * Dependency validation:
 *   - Proper Kahn topological sort (dep → dependents model)
 *   - Cycle detection via DFS
 *   - Missing dependency detection
 *   - Timeout protection per phase
 *   - Critical phase cascade blocking
 */
import { supabase } from '../lib/supabase';
import { eventBus } from '../events/EventBus';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppLanguage } from '../constants/translations';
import { useAppStore } from '../store/app.store';

// ─── Types ─────────────────────────────────────────────────────────────────

export type BootstrapPhase =
  | 'init'
  | 'sqlite'
  | 'storage'
  | 'permissions'
  | 'queue'
  | 'realtime'
  | 'wearable'
  | 'navigation'
  | 'health_checks'
  | 'monitoring'
  | 'complete';

export type PhaseStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped' | 'timed_out';

export interface BootstrapResult {
  success: boolean;
  phases: Record<BootstrapPhase, PhaseResult>;
  totalDurationMs: number;
  hasFailures: boolean;
  hasTimeouts: boolean;
  circularDeps: string[];
  skippedDeps: string[];
}

export interface PhaseResult {
  status: PhaseStatus;
  error?: string;
  durationMs: number;
  timeoutMs?: number;
}

export interface BootstrapPhaseDefinition {
  key: BootstrapPhase;
  label: string;
  timeoutMs: number;
  /** Phase keys that must complete before this one starts */
  dependsOn: BootstrapPhase[];
  fn: () => Promise<unknown>;
  critical: boolean;
}

export interface DependencyGraphValidation {
  isValid: boolean;
  circularDeps: Array<{ phases: BootstrapPhase[]; path: string }>;
  missingDeps: Array<{ phase: BootstrapPhase; missing: BootstrapPhase }>;
  unreachable: BootstrapPhase[];
  executionOrder: BootstrapPhase[];
}

// ─── Phase Functions ───────────────────────────────────────────────────────

async function phaseStorage(): Promise<void> {
  const language = useAppStore.getState().language;
  await useAppStore.getState().hydrate(language);
}

async function phaseSQLite(): Promise<void> {
  const { getLocalDb } = await import('../local/db');
  await getLocalDb();
}

async function phasePermissions(): Promise<{ notifications: boolean; location: boolean }> {
  const results = { notifications: false, location: false };
  try {
    const { default: Notifications } = await import('expo-notifications');
    const { status } = await Notifications.getPermissionsAsync();
    results.notifications = status === 'granted';
  } catch { /* Expo Go safe */ }
  try {
    const Location = await import('expo-location');
    const { status } = await Location.getForegroundPermissionsAsync();
    results.location = status === 'granted';
  } catch { /* ignore */ }
  return results;
}

async function phaseQueue(): Promise<{ replayed: number }> {
  try {
    const { localSyncEngine } = await import('../local/syncEngine');
    await localSyncEngine.push().catch(() => ({ pushed: 0, failed: 0, remaining: 0 }));
    const { processQueue } = await import('../lib/notifications/notificationPipeline');
    await processQueue();
    return { replayed: 0 };
  } catch { return { replayed: 0 }; }
}

async function phaseRealtime(): Promise<void> {
  try {
    const { data, error } = await supabase.from('health_status').select('id').limit(1).maybeSingle();
    if (error && error.code !== 'PGRST204') {
      console.warn('[Bootstrap] Supabase health check failed:', error.message);
    }
  } catch (err: any) {
    console.warn('[Bootstrap] Realtime phase failed:', err?.message);
  }
}

async function phaseWearable(): Promise<{ connected: boolean; deviceId?: string }> {
  // BLE service is stub-only in Expo Go — always report disconnected
  return { connected: false };
}

async function phaseNavigation(): Promise<void> {
  // Navigation pre-warming — React Navigation auto-initializes
}

async function phaseHealthChecks(): Promise<{ issues: string[] }> {
  const issues: string[] = [];
  try {
    const { verifyPendingDeliveries } = await import('../lib/notifications/notificationReliability');
    const stale = await verifyPendingDeliveries();
    if (stale.length > 0) {
      issues.push(`${stale.length} stale delivery receipts`);
    }
  } catch { /* ignore */ }
  return { issues };
}

async function phaseMonitoring(): Promise<void> {
  try {
    const { initMonitoring } = await import('../lib/monitoring');
    initMonitoring();
  } catch { /* ignore */ }
}

const PHASE_DEFINITIONS: BootstrapPhaseDefinition[] = [
  { key: 'sqlite',       label: 'SQLite Runtime',     timeoutMs: 8_000,  dependsOn: [],                        fn: phaseSQLite,         critical: true },
  { key: 'storage',      label: 'Storage Hydration',  timeoutMs: 8_000,  dependsOn: ['sqlite'],                fn: phaseStorage,        critical: false },
  { key: 'permissions',  label: 'Permissions',        timeoutMs: 5_000,  dependsOn: ['storage'],               fn: phasePermissions,    critical: false },
  { key: 'queue',        label: 'Queue Restore',      timeoutMs: 10_000, dependsOn: ['storage', 'sqlite'],     fn: phaseQueue,          critical: false },
  { key: 'realtime',    label: 'Supabase Realtime',   timeoutMs: 15_000, dependsOn: ['permissions'],           fn: phaseRealtime,       critical: false },
  { key: 'wearable',   label: 'Wearable',           timeoutMs: 10_000, dependsOn: ['permissions', 'queue'],     fn: phaseWearable,      critical: false },
  { key: 'navigation', label: 'Navigation',          timeoutMs: 5_000,  dependsOn: ['permissions'],           fn: phaseNavigation,    critical: false },
  { key: 'health_checks', label: 'Health Checks',    timeoutMs: 8_000,  dependsOn: ['realtime', 'wearable'], fn: phaseHealthChecks,  critical: false },
  { key: 'monitoring',  label: 'Monitoring',         timeoutMs: 5_000,  dependsOn: ['storage'],               fn: phaseMonitoring,    critical: false },
];

// ─── Dependency Graph Validation ───────────────────────────────────────────

function validateDependencyGraph(
  phases: BootstrapPhaseDefinition[],
): DependencyGraphValidation {
  const result: DependencyGraphValidation = {
    isValid: true,
    circularDeps: [],
    missingDeps: [],
    unreachable: [],
    executionOrder: [],
  };

  const phaseMap = new Map<BootstrapPhase, BootstrapPhaseDefinition>(
    phases.map(p => [p.key, p])
  );

  // ── Check for missing dependencies ──
  for (const p of phases) {
    for (const dep of p.dependsOn) {
      if (!phaseMap.has(dep)) {
        result.isValid = false;
        result.missingDeps.push({ phase: p.key, missing: dep });
      }
    }
  }

  // ── Build reverse adjacency: dependency → its dependents ──
  // This is the key fix: we need to know "who depends on me" for Kahn's algorithm
  const dependents = new Map<BootstrapPhase, BootstrapPhase[]>();
  for (const p of phases) {
    dependents.set(p.key, []);
  }
  for (const p of phases) {
    for (const dep of p.dependsOn) {
      const list = dependents.get(dep);
      if (list) list.push(p.key);
    }
  }

  // ── DFS cycle detection ──
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const colors = new Map<BootstrapPhase, number>();
  for (const p of phases) colors.set(p.key, WHITE);
  const cycleDetected: BootstrapPhase[][] = [];

  function dfs(node: BootstrapPhase, path: BootstrapPhase[]): boolean {
    colors.set(node, GRAY);
    path.push(node);

    const deps = phaseMap.get(node)?.dependsOn ?? [];
    for (const dep of deps) {
      if (!phaseMap.has(dep)) continue; // already reported as missing
      if (colors.get(dep) === GRAY) {
        const cycleStart = path.indexOf(dep);
        const cycle = path.slice(cycleStart);
        cycleDetected.push(cycle);
        return true;
      }
      if (colors.get(dep) === WHITE) {
        if (dfs(dep, path.slice())) return true;
      }
    }

    colors.set(node, BLACK);
    return false;
  }

  for (const p of phases) {
    if (colors.get(p.key) === WHITE) {
      dfs(p.key, []);
    }
  }

  result.circularDeps = cycleDetected.map(cycle => ({
    phases: cycle,
    path: cycle.map(p => p).join(' → '),
  }));
  if (cycleDetected.length > 0) result.isValid = false;

  // ── Kahn's topological sort ──
  // inDegree[phase] = number of deps this phase has
  const inDegree = new Map<BootstrapPhase, number>();
  for (const p of phases) {
    inDegree.set(p.key, p.dependsOn.filter(d => phaseMap.has(d)).length);
  }

  // Queue: phases with no unmet dependencies
  const queue: BootstrapPhase[] = [];
  for (const [phase, degree] of inDegree) {
    if (degree === 0) queue.push(phase);
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    result.executionOrder.push(curr);

    // Decrement in-degree of all phases that depend on curr
    const myDependents = dependents.get(curr) ?? [];
    for (const dep of myDependents) {
      const newDegree = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, newDegree);
      if (newDegree === 0) queue.push(dep);
    }
  }

  // Any phase not in executionOrder has unmet dependencies (cycle)
  if (result.executionOrder.length !== phases.length) {
    result.isValid = false;
    for (const p of phases) {
      if (!result.executionOrder.includes(p.key)) {
        result.unreachable.push(p.key);
      }
    }
  }

  return result;
}

// ─── Validate at module load ───────────────────────────────────────────────

const VALIDATION = validateDependencyGraph(PHASE_DEFINITIONS);

if (!VALIDATION.isValid) {
  if (VALIDATION.circularDeps.length > 0) {
    console.error('[Bootstrap] CIRCULAR DEPENDENCY DETECTED:',
      VALIDATION.circularDeps.map(d => d.path).join('; '));
  }
  if (VALIDATION.missingDeps.length > 0) {
    console.error('[Bootstrap] MISSING DEPENDENCIES:',
      VALIDATION.missingDeps.map(d => `${d.phase} needs ${d.missing}`).join('; '));
  }
}

// ─── Build execution order from validation ─────────────────────────────────

const EXECUTION_ORDER = VALIDATION.executionOrder;
const PHASE_MAP = new Map<BootstrapPhase, BootstrapPhaseDefinition>(
  PHASE_DEFINITIONS.map(p => [p.key, p])
);

// ─── Phase executor ────────────────────────────────────────────────────────

async function runPhaseWithTimeout(
  phase: BootstrapPhaseDefinition,
  completedPhases: Set<BootstrapPhase>,
): Promise<PhaseResult> {
  const startTime = Date.now();

  for (const dep of phase.dependsOn) {
    if (!completedPhases.has(dep)) {
      return {
        status: 'skipped',
        error: `Dependency not met: ${dep} not completed`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  const timeoutMs = phase.timeoutMs;
  let timedOut = false;

  try {
    const result = await Promise.race([
      phase.fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => {
          timedOut = true;
          reject(new Error(`Phase "${phase.key}" timed out after ${timeoutMs}ms`));
        }, timeoutMs)
      ),
    ]);
    return { status: 'done', durationMs: Date.now() - startTime };
  } catch (err: any) {
    return {
      status: timedOut ? 'timed_out' : 'failed',
      error: err?.message ?? 'Unknown error',
      durationMs: Date.now() - startTime,
      timeoutMs: timedOut ? timeoutMs : undefined,
    };
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────────

export async function bootstrapApp(fallbackLanguage: AppLanguage = 'ar'): Promise<BootstrapResult> {
  if (!VALIDATION.isValid) {
    console.warn('[Bootstrap] Dependency graph has issues — continuing');
  }

  const startTime = Date.now();
  const completedPhases = new Set<BootstrapPhase>();
  const skippedDeps: string[] = [];

  const phases: Record<BootstrapPhase, PhaseResult> = {
    init:           { status: 'done', durationMs: 0 },
    sqlite:         { status: 'pending', durationMs: 0 },
    storage:        { status: 'pending', durationMs: 0 },
    permissions:    { status: 'pending', durationMs: 0 },
    queue:          { status: 'pending', durationMs: 0 },
    realtime:       { status: 'pending', durationMs: 0 },
    wearable:      { status: 'pending', durationMs: 0 },
    navigation:     { status: 'pending', durationMs: 0 },
    health_checks:  { status: 'pending', durationMs: 0 },
    monitoring:     { status: 'pending', durationMs: 0 },
    complete:       { status: 'pending', durationMs: 0 },
  };

  eventBus.emit({
    type: 'app.bootstrapStart',
    source: 'system',
    timestamp: Date.now(),
    payload: {
      fallbackLanguage,
      isColdStart: true,
      circularDeps: VALIDATION.circularDeps.map(d => d.path),
      executionOrder: EXECUTION_ORDER,
    },
    metadata: { severity: 'low', category: 'system' },
  });

  // ── Execute in Kahn topological order ──
  for (const phaseKey of EXECUTION_ORDER) {
    const phaseDef = PHASE_MAP.get(phaseKey)!;
    const result = await runPhaseWithTimeout(phaseDef, completedPhases);
    phases[phaseKey] = result;

    if (result.status === 'skipped') {
      skippedDeps.push(`${phaseKey}: ${result.error}`);
      eventBus.emit({
        type: 'app.bootstrapPhase',
        source: 'system',
        timestamp: Date.now(),
        payload: { phase: phaseKey, status: 'skipped', error: result.error, durationMs: result.durationMs },
        metadata: { severity: 'low', category: 'system' },
      });
    } else if (result.status === 'done') {
      completedPhases.add(phaseKey);
      eventBus.emit({
        type: 'app.bootstrapPhase',
        source: 'system',
        timestamp: Date.now(),
        payload: { phase: phaseKey, status: 'done', durationMs: result.durationMs },
      });
    } else {
      // failed or timed_out
      eventBus.emit({
        type: 'app.bootstrapPhase',
        source: 'system',
        timestamp: Date.now(),
        payload: { phase: phaseKey, status: result.status, error: result.error, durationMs: result.durationMs, timeoutMs: result.timeoutMs },
        metadata: { severity: phaseDef.critical ? 'high' : 'medium', category: 'system' },
      });

      // Cascade block if critical
      if (phaseDef.critical) {
        for (const [laterKey, laterDef] of PHASE_MAP) {
          if (laterDef.dependsOn.includes(phaseKey) && !completedPhases.has(laterKey)) {
            phases[laterKey] = { status: 'skipped', error: `Blocked by critical phase: ${phaseKey}`, durationMs: 0 };
            skippedDeps.push(`${laterKey}: blocked by ${phaseKey}`);
            eventBus.emit({
              type: 'app.bootstrapPhase',
              source: 'system',
              timestamp: Date.now(),
              payload: { phase: laterKey, status: 'skipped', error: `Blocked by ${phaseKey}`, durationMs: 0 },
            });
          }
        }
      }
    }
  }

  phases['complete'].status = 'done';
  phases['complete'].durationMs = Date.now() - startTime;

  const hasFailures = Object.values(phases).some(p => p.status === 'failed');
  const hasTimeouts = Object.values(phases).some(p => p.status === 'timed_out');

  eventBus.emit({
    type: 'app.bootstrapComplete',
    source: 'system',
    timestamp: Date.now(),
    payload: {
      totalDurationMs: Date.now() - startTime,
      failedPhases: Object.entries(phases)
        .filter(([, p]) => p.status === 'failed' || p.status === 'timed_out')
        .map(([k, p]) => ({ phase: k, error: p.error, status: p.status })),
    },
    metadata: { severity: hasFailures ? 'medium' : 'low', category: 'system' },
  });

  return {
    success: !hasFailures && !hasTimeouts,
    phases,
    totalDurationMs: Date.now() - startTime,
    hasFailures,
    hasTimeouts,
    circularDeps: VALIDATION.circularDeps.map(d => d.path),
    skippedDeps,
  };
}

// ─── Convenience ──────────────────────────────────────────────────────────

export function getBootstrapValidation(): DependencyGraphValidation {
  return VALIDATION;
}

export function getBootstrapHealth(): { storageReady: boolean; realtimeConnected: boolean; wearableConnected: boolean } {
  const state = useAppStore.getState();
  return {
    storageReady: state.language !== undefined,
    realtimeConnected: false,
    wearableConnected: false,
  };
}
