/**
 * Legacy compatibility shim.
 * The canonical Supabase client lives in src/services/supabase.ts.
 * This file re-exports from there so any remaining old imports still resolve
 * without crashing, and WITHOUT creating a second client instance.
 */
export { supabase } from '../src/services/supabase';