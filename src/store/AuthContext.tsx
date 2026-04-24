/**
 * @deprecated — Use useAuthStore from './auth.store' instead.
 * This file is safe to delete once all imports are migrated.
 */
import { useAuthStore } from './auth.store';

export function useAuth() {
  const session = useAuthStore.getState().session;
  return {
    user: session?.user ?? null,
    session,
    loading: false,
    signOut: useAuthStore.getState().signOut,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return children as React.ReactElement;
}

import React from 'react';
