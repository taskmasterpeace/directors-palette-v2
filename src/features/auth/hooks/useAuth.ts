'use client';

import { useState, useEffect, useRef } from 'react';
import { AuthService } from '../services/auth.service';
import type { AuthState, SignInCredentials } from '../types/auth.types';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: false,
    error: null,
  });
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      try {
        // Race getSession against a timeout to prevent permanent loading state
        const result = await Promise.race([
          AuthService.getSession(),
          new Promise<{ session: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ session: null, error: { message: 'Session check timed out' } }), 5000)
          ),
        ]);

        setAuthState({
          user: result.session?.user ?? null,
          session: result.session,
          isLoading: false,
          error: result.error?.message ?? null,
        });
      } catch {
        // Ensure loading state is always cleared
        setAuthState(prev => ({ ...prev, isLoading: false, error: 'Failed to check session' }));
      }
    };

    initAuth();

    // Listen for auth state changes
    const setupSubscription = async () => {
      const subscription = await AuthService.onAuthStateChange((user) => {
        setAuthState((prev) => ({
          ...prev,
          user,
          isLoading: false,
        }));
      });

      subscriptionRef.current = subscription;
    };

    setupSubscription();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  const signIn = async (credentials: SignInCredentials) => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    const { user, session, error } = await AuthService.signIn(credentials);

    if (error) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      return { success: false, error };
    }

    setAuthState({
      user,
      session,
      isLoading: false,
      error: null,
    });

    return { success: true };
  };

  const signOut = async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true }));

    const { error } = await AuthService.signOut();

    if (error) {
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      return { success: false, error };
    }

    setAuthState({
      user: null,
      session: null,
      isLoading: false,
      error: null,
    });

    return { success: true };
  };

  return {
    ...authState,
    signIn,
    signOut,
  };
}
