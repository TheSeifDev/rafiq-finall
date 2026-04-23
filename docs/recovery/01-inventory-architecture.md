# Architecture Inventory (Canonical vs Legacy)

## Canonical (keep)
- Navigation root: `App.tsx` -> `src/navigation/RootNavigator.tsx`
- Auth/session state: `src/store/auth.store.ts`
- App settings state: `src/store/app.store.ts`
- Supabase client: `src/lib/supabase.ts`
- Active screen set: `src/screens/*Screen.tsx`
- Active services: `src/services/*.service.ts` used by `*Screen.tsx`

## Legacy (deprecate then remove)
- `src/navigation/AppNavigator.tsx` (now compatibility wrapper only)
- `src/store/AuthContext.tsx` and `src/store/ThemeContext.tsx`
- Folder-based screens under `src/screens/*/index.tsx`
- `src/services/supabase.ts` and `lib/supabase.ts` as compatibility shims

## Ownership boundaries
- `navigation/`: route declaration only, no data access.
- `screens/`: composition + interaction logic, delegate data to hooks/services.
- `hooks/`: feature state orchestration.
- `services/`: Supabase access and data normalization.
- `types/`: domain and navigation contracts only.

## Deletion criteria
- No module is deleted before proving zero imports with search.
- Compatibility wrappers remain until all callers are migrated.
