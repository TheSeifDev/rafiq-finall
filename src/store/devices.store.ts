import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────

export type DeviceType = "watch" | "gas" | "motion";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  battery?: number;
  isConnected: boolean;
  lastSeen: string; // ISO timestamp
}

export interface DevicesState {
  devices: Device[];
  hydrated: boolean;
  addDevice: (name: string, type: DeviceType) => void;
  removeDevice: (id: string) => void;
  renameDevice: (id: string, name: string) => void;
  toggleConnection: (id: string) => void;
  _hydrate: () => Promise<void>;
}

// ── Helpers ──────────────────────────────────────────────────

const STORAGE_KEY = "@rafiq_devices";

function uid(): string {
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function randomBattery(): number {
  return Math.floor(Math.random() * 60) + 30; // 30-89
}

function persist(devices: Device[]) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(devices)).catch(() => {});
}

// ── Default seed devices ─────────────────────────────────────

const SEED: Device[] = [
  {
    id: uid(),
    name: "Raqeeb Gas Sensor",
    type: "gas",
    isConnected: true,
    lastSeen: new Date(Date.now() - 2 * 60_000).toISOString(),
  },
  {
    id: uid(),
    name: "mmWave Motion Sensor",
    type: "motion",
    isConnected: true,
    lastSeen: new Date(Date.now() - 5 * 60_000).toISOString(),
  },
  {
    id: uid(),
    name: "Smart Watch",
    type: "watch",
    battery: 23,
    isConnected: false,
    lastSeen: new Date(Date.now() - 3 * 3600_000).toISOString(),
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
        set({ devices: parsed, hydrated: true });
      } else {
        // First launch — seed defaults
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
      battery: type === "watch" ? randomBattery() : undefined,
      isConnected: Math.random() > 0.3, // 70% chance connected
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

  toggleConnection: (id) => {
    const next = get().devices.map((d) =>
      d.id === id
        ? {
            ...d,
            isConnected: !d.isConnected,
            lastSeen: new Date().toISOString(),
          }
        : d,
    );
    persist(next);
    set({ devices: next });
  },
}));
