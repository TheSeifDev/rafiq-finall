# Feature-by-Feature Migration Order

## Order (lowest regression risk first)
1. **Infrastructure shims**
   - Keep wrappers compiling (`AppNavigator`, Supabase shims, context compatibility).
2. **Auth + onboarding**
   - Migrate all auth-related legacy screens/hooks to `*Screen.tsx` and `useAuthStore`.
3. **Profile + settings**
   - Move profile/settings callers to canonical services and route types.
4. **Vitals + medications**
   - Consolidate hooks/service callers; remove duplicate `index.tsx` screen variants.
5. **Notifications + realtime**
   - Keep subscription API stable while unifying service names.
6. **Chat**
   - Move to backend-proxied AI endpoint only.

## Migration rules
- Keep screen route names stable unless explicitly approved.
- Preserve existing component props while migrating internals.
- For each migrated module, update imports and run zero-import check on replaced file.
