import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export const authService = {
  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(error?.message ?? 'Login failed');
    return data.session;
  },
  async signUp(email: string, password: string): Promise<void> {
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: undefined } });
    if (error) throw new Error(error.message);
  },
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },
  async resetPassword(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  },
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  },
  async getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },
  onAuthStateChange(
    callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
  ): { unsubscribe: () => void } {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);
    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },
  /**
   * Resend the verification email for an unconfirmed user.
   * Uses `resend` API (Supabase v2+). Falls back to signUp re-trigger.
   */
  async resendVerification(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw new Error(error.message);
  },
  /**
   * Update the current user's password via Supabase Auth.
   */
  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  },
};
