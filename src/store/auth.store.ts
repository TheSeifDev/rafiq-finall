import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { authService } from '../services/auth.service';
import { supabase } from '../lib/supabase';

export type AuthState = {
  session: Session | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * On first login after signup, creates the `patients` row from auth.user metadata.
 * This is deferred from signup because RLS blocks inserts when there's no active session
 * (e.g. when email confirmation is required).
 */
async function ensurePatientRow(session: Session): Promise<void> {
  const user = session.user;
  if (!user) return;

  try {
    // Check if patient row already exists
    const { data: existing } = await supabase
      .from('patients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) return; // Already exists, nothing to do

    // Extract metadata stored during signup
    const meta = user.user_metadata ?? {};
    const fullName = meta.full_name ?? meta.name ?? '';

    // Only create if we have a name (indicates this user went through our signup flow)
    if (!fullName) return;

    await supabase.from('patients').insert({
      user_id: user.id,
      full_name: fullName,
      phone: meta.phone ?? null,
      location: meta.location ?? null,
      birth_date: meta.birth_date ?? null,
    });
  } catch {
    // Non-fatal: patient row creation failure shouldn't block login
    // It will be retried on next session restoration
    console.warn('[auth] ensurePatientRow failed, will retry on next session');
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,

  initialize: async () => {
    // 1. Restore existing session
    const session = await authService.getSession();
    set({ session, loading: false });

    if (session) {
      ensurePatientRow(session);
    }

    // 2. Listen for future auth state changes (login/logout/token refresh)
    authService.onAuthStateChange(async (_event, newSession) => {
      set({ session: newSession, loading: false });

      if (newSession) {
        ensurePatientRow(newSession);
      }
    });
  },

  signIn: async (email, password) => {
    const session = await authService.signIn(email, password);
    set({ session });
    // Create patient row if it doesn't exist yet
    ensurePatientRow(session);
  },

  signUp: async (email, password) => {
    await authService.signUp(email, password);
  },

  signOut: async () => {
    await authService.signOut();
    set({ session: null });
  },
}));
