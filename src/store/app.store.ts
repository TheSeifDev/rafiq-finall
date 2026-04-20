import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { AppLanguage } from '../constants/translations';

type NotificationPrefs = {
  medicationReminders: boolean;
  vitalsAlerts: boolean;
};

type AppState = {
  language: AppLanguage;
  darkMode: boolean;
  notificationPrefs: NotificationPrefs;
  hydrate: (fallbackLanguage: AppLanguage) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
  setNotificationPrefs: (prefs: Partial<NotificationPrefs>) => Promise<void>;
};

const STORAGE_KEY = 'rafiq_app_prefs_v2';

export const useAppStore = create<AppState>((set, get) => ({
  language: 'ar',
  darkMode: false,
  notificationPrefs: { medicationReminders: true, vitalsAlerts: true },
  hydrate: async (fallbackLanguage) => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      set({ language: fallbackLanguage });
      return;
    }
    const parsed = JSON.parse(raw) as Omit<AppState, 'hydrate' | 'setLanguage' | 'setDarkMode' | 'setNotificationPrefs'>;
    set(parsed);
  },
  setLanguage: async (language) => {
    set({ language });
    const state = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ language: state.language, darkMode: state.darkMode, notificationPrefs: state.notificationPrefs }));
  },
  setDarkMode: async (enabled) => {
    set({ darkMode: enabled });
    const state = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ language: state.language, darkMode: state.darkMode, notificationPrefs: state.notificationPrefs }));
  },
  setNotificationPrefs: async (prefs) => {
    set((state) => ({ notificationPrefs: { ...state.notificationPrefs, ...prefs } }));
    const state = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ language: state.language, darkMode: state.darkMode, notificationPrefs: state.notificationPrefs }));
  },
}));
