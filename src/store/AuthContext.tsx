import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { authService } from '../services/auth.service';
import { patientService } from '../services/patient.service';

// ---------- State ----------
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasPatient: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  hasPatient: false,
};

// ---------- Actions ----------
type AuthAction =
  | { type: 'SET_SESSION'; session: Session | null; user: User | null }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_HAS_PATIENT'; hasPatient: boolean }
  | { type: 'SIGN_OUT' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        user: action.user,
        session: action.session,
        isAuthenticated: Boolean(action.user),
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };
    case 'SET_HAS_PATIENT':
      return { ...state, hasPatient: action.hasPatient };
    case 'SIGN_OUT':
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
}

// ---------- Context ----------
interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null; needsVerification: boolean }>;
  signOut: () => Promise<void>;
  refreshPatientStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------- Provider ----------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize: check existing session + listen for changes
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const session = await authService.getSession();
        const user = session?.user ?? null;

        if (isMounted) {
          dispatch({ type: 'SET_SESSION', session, user });

          if (user) {
            const has = await patientService.hasPatient(user.id);
            if (isMounted) dispatch({ type: 'SET_HAS_PATIENT', hasPatient: has });
          }
        }
      } catch {
        if (isMounted) dispatch({ type: 'SET_LOADING', isLoading: false });
      }
    };

    initialize();

    const subscription = authService.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      if (isMounted) {
        dispatch({ type: 'SET_SESSION', session, user });

        if (user) {
          const has = await patientService.hasPatient(user.id);
          if (isMounted) dispatch({ type: 'SET_HAS_PATIENT', hasPatient: has });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await authService.signIn(email, password);
      return { error: null };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error.message : 'تعذر تسجيل الدخول' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      void fullName;
      await authService.signUp(email, password);
      return { error: null, needsVerification: true };
    } catch (error: unknown) {
      return { error: error instanceof Error ? error.message : 'تعذر إنشاء الحساب', needsVerification: false };
    }
  };

  const signOut = async () => {
    await authService.signOut();
    dispatch({ type: 'SIGN_OUT' });
  };

  const refreshPatientStatus = async () => {
    if (state.user) {
      const has = await patientService.hasPatient(state.user.id);
      dispatch({ type: 'SET_HAS_PATIENT', hasPatient: has });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        refreshPatientStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------- Hook ----------
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
