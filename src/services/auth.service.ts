import { supabase } from './supabase';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export interface SignInParams {
  email: string;
  password: string;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
}

export const authService = {
  async signIn({ email, password }: SignInParams): Promise<{ user: User | null; error: string | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { user: null, error: error.message };
    }
    return { user: data.user, error: null };
  },

  async signUp({ email, password, fullName }: SignUpParams): Promise<{ user: User | null; error: string | null; needsVerification: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      return { user: null, error: error.message, needsVerification: false };
    }

    const needsVerification = !data.session;
    return { user: data.user, error: null, needsVerification };
  },

  async signOut(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  },

  async getSession(): Promise<{ session: Session | null; error: string | null }> {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error: error?.message ?? null };
  },

  async getUser(): Promise<{ user: User | null; error: string | null }> {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error: error?.message ?? null };
  },

  async resetPassword(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error: error?.message ?? null };
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange(callback);
    return data.subscription;
  },
};
