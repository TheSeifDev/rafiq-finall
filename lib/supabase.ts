/**
 * Legacy compatibility shim.
 * The canonical Supabase client lives in src/lib/supabase.ts.
 * This file re-exports from there so any remaining old imports still resolve
 * without crashing, and WITHOUT creating a second client instance.
 */
export { supabase } from '../src/lib/supabase';