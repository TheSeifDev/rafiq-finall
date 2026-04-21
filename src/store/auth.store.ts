import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { authService } from '../services/auth.service';

export type AuthState = {
  session: Session | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: true,
  initialize: async () => {
    const session = await authService.getSession();
    set({ session, loading: false });
  },
  signIn: async (email, password) => {
    const session = await authService.signIn(email, password);
    set({ session });
  },
  signUp: async (email, password) => {
    await authService.signUp(email, password);
  },
  signOut: async () => {
    await authService.signOut();
    set({ session: null });
  },
}));
