/**
 * Devices Store — non-medical IoT devices only (gas sensor, motion sensor).
 *
 * REMOVED:
 * - Fake "Smart Watch" seed device (Oraimo syncs via Health Connect, not BLE)
 * - randomBattery() — no random values
 * - Math.random() connected state
 *
 * The watch vitals state is managed exclusively by HealthConnectService.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────

export type DeviceType = 'gas' | 'motion';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  isConnected: boolean;
  lastSeen: string; // ISO timestamp
}

export interface DevicesState {
  devices: Device[];
  hydrated: boolean;
  addDevice: (name: string, type: DeviceType) => void;
  removeDevice: (id: string) => void;
  renameDevice: (id: string, name: string) => void;
  setConnected: (id: string, connected: boolean) => void;
  _hydrate: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────

const STORAGE_KEY = '@rafiq_devices';

function uid(): string {
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function persist(devices: Device[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(devices)).catch(() => {});
}

// ── Default seed devices — IoT only, NO smartwatch ──────────

const SEED: Device[] = [
  {
    id: uid(),
    name: 'Raqeeb Gas Sensor',
    type: 'gas',
    isConnected: false, // real state unknown until BLE scan
    lastSeen: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: uid(),
    name: 'mmWave Motion Sensor',
    type: 'motion',
    isConnected: false, // real state unknown until BLE scan
    lastSeen: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
];

// ── Store ────────────────────────────────────────────────────

export const useDevicesStore = create<DevicesState>((set, get) => ({
  devices: [],
  hydrated: false,

  _hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Device[] = JSON.parse(raw);
        // Filter out any previously seeded watch devices — those are not managed here
        const filtered = parsed.filter((d) => d.type !== ('watch' as any));
        set({ devices: filtered, hydrated: true });
      } else {
        persist(SEED);
        set({ devices: SEED, hydrated: true });
      }
    } catch {
      set({ devices: SEED, hydrated: true });
    }
  },

  addDevice: (name, type) => {
    const device: Device = {
      id: uid(),
      name,
      type,
      isConnected: false, // always start disconnected — never optimistic
      lastSeen: new Date().toISOString(),
    };
    const next = [...get().devices, device];
    persist(next);
    set({ devices: next });
  },

  removeDevice: (id) => {
    const next = get().devices.filter((d) => d.id !== id);
    persist(next);
    set({ devices: next });
  },

  renameDevice: (id, name) => {
    const next = get().devices.map((d) => (d.id === id ? { ...d, name } : d));
    persist(next);
    set({ devices: next });
  },

  setConnected: (id, connected) => {
    const next = get().devices.map((d) =>
      d.id === id
        ? { ...d, isConnected: connected, lastSeen: new Date().toISOString() }
        : d,
    );
    persist(next);
    set({ devices: next });
  },
}));
