// ─── Expo Go SDK Warning Suppression ────────────────────────
// This MUST execute before ANY import that touches expo-notifications.
// The SDK's DevicePushTokenAutoRegistration.fx.js fires side-effect
// code on module evaluation that calls console.error() in Expo Go.
//
// Since ES `import` statements are hoisted, we use inline require()
// for expo-constants to check the environment, then patch console
// BEFORE the App import pulls in the notification chain.

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

// ─── Now safe to import App (which imports expo-notifications) ──
import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
