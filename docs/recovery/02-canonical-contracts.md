# Canonical Contracts

## Supabase client contract
- Canonical module: `src/lib/supabase.ts`
- Accepted env vars:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (primary)
  - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (fallback compatibility)
- Legacy import paths (`src/services/supabase.ts`, `lib/supabase.ts`) must only re-export canonical client.

## Auth state contract
- Source of truth: `useAuthStore` in `src/store/auth.store.ts`
- Required fields:
  - `session: Session | null`
  - `loading: boolean`
- Required actions:
  - `initialize()`
  - `signIn(email, password)`
  - `signUp(email, password)`
  - `signOut()`
- `AuthContext` is compatibility-only and must not be used for new features.

## Navigation contract
- Single container mounted in `App.tsx`.
- Root switch happens in `RootNavigator` using session state from `useAuthStore`.
- Route type contracts:
  - `AuthStackParamList`
  - `MainTabParamList`
  - `ProfileStackParamList`
- Deep-link definitions must align with root-level graph, not tab-only assumptions.
