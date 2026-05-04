// ─────────────────────────────────────────────────────────────
// index.ts — Application entry point
// ─────────────────────────────────────────────────────────────
// This file runs BEFORE any component mounts. It performs two
// critical setup steps:
//
//   1. Set I18nManager RTL direction ONCE (never again)
//   2. Suppress expo-notifications SDK console errors in Expo Go
//
// After this file, I18nManager is NEVER used again in the app.
// All components derive isRTL from: language === 'ar' (Zustand).
// ─────────────────────────────────────────────────────────────

import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';

// ─── Step 1: Lock RTL direction ONCE at startup ─────────────
// I18nManager.forceRTL must only be called before the component
// tree mounts. Calling it later causes the entire app layout to
// flip unpredictably. We detect the device locale here and set
// it permanently for this session.
const deviceIsArabic = Localization.getLocales()[0]?.languageCode === 'ar';
I18nManager.allowRTL(true);
I18nManager.forceRTL(deviceIsArabic);

// ─── Step 2: Suppress Expo Go SDK warnings ──────────────────
// expo-notifications has side-effect code that fires console.error()
// and console.warn() when imported in Expo Go. We patch console
// BEFORE importing App (which imports expo-notifications).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExpoConstants = require('expo-constants').default as typeof import('expo-constants')['default'];

if (ExpoConstants.appOwnership === 'expo') {
  const _err = console.error;
  const _warn = console.warn;
  const pat = /expo-notifications/;

  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && pat.test(args[0])) return;
    _err.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && pat.test(args[0])) return;
    _warn.apply(console, args);
  };

  // Restore after a tick (all module-level side-effects will have fired)
  setTimeout(() => {
    console.error = _err;
    console.warn = _warn;
  }, 0);
}

// ─── Step 3: Register the app ───────────────────────────────
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
