# Rafiq (رفيق) – Expo React Native Health Companion

A rebuilt Arabic-first (RTL) healthcare companion with Supabase-backed real data, unified design system, modern navigation, and extensible AI/Bluetooth layers.

## What is included
- Arabic-first + English fallback localization.
- React Navigation architecture: Auth stack + Main bottom tabs + Profile settings stack.
- Design system tokens and shared components (`AppText`, `AppButton`, `AppInput`, `AppCard`, `Screen`, `BottomTabBar`, `LoadingOverlay`, `EmptyState`, `ErrorMessage`).
- Supabase service layer (no direct UI access): auth, patient, vitals, medications, notifications.
- Settings screen with real profile data, dark mode, language toggle, notification preferences, and logout.
- Functional medications list + add form.
- Functional chat screen with AI request flow.
- Vitals history with manual entry, BLE scan/connect hooks, and chart rendering.
- Emergency center with one-tap calling and first-aid cards.
- SQL migration with RLS policies.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env
   ```
3. Start app:
   ```bash
   npm run start
   ```

## Environment variables
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OPENAI_API_KEY`

## Database migration
Run `supabase/migrations/20260420_init.sql` in your Supabase SQL editor.

## Notes
- BLE historical sync is scaffolded and can be extended per vendor APIs.
- For production AI, move OpenAI calls from client to a secure backend/edge function.
