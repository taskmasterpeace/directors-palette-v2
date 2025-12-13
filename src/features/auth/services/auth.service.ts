import { getClient } from "@/lib/db/client";
import type { SignInCredentials, AuthError, AuthUser, AuthSession } from '../types/auth.types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export class AuthService {
  private static supabasePromise = getClient(); // lazy init

  private static async supabase() {
    return await this.supabasePromise;
  }
  /**
   * Sign in with email and password
   */
  static async signIn(credentials: SignInCredentials): Promise<{
    user: AuthUser | null;
    session: AuthSession | null;
    error: AuthError | null;
  }> {
    try {
      const supabase = await this.supabase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: { message: error.message, code: error.status?.toString() },
        };
      }

      return {
        user: data.user,
        session: data.session,
        error: null,
      };
    } catch {
      return {
        user: null,
        session: null,
        error: { message: 'An unexpected error occurred' },
      };
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const supabase = await getClient()
      const { error } = await supabase.auth.signOut();

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch {
      return { error: { message: 'An unexpected error occurred' } };
    }
  }

  /**
   * Get current session
   */
  static async getSession(): Promise<{
    session: AuthSession | null;
    error: AuthError | null;
  }> {
    try {
      const supabase = await this.supabase();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return {
          session: null,
          error: { message: error.message },
        };
      }

      return {
        session: data.session,
        error: null,
      };
    } catch {
      return {
        session: null,
        error: { message: 'An unexpected error occurred' },
      };
    }
  }

  /**
   * Get current user
   */
  static async getUser(): Promise<{
    user: AuthUser | null;
    error: AuthError | null;
  }> {
    try {
      const supabase = await this.supabase();
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return {
          user: null,
          error: { message: error.message },
        };
      }

      return {
        user: data.user,
        error: null,
      };
    } catch {
      return {
        user: null,
        error: { message: 'An unexpected error occurred' },
      };
    }
  }

  /**
   * Listen to auth state changes
   */
  static async onAuthStateChange(callback: (user: AuthUser | null) => void): Promise<{ unsubscribe: () => void }> {
    const supabase = await this.supabase();
    const { data: { subscription } } = await supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        callback(session?.user ?? null);
      }
    );

    return subscription;
  }

  /**
   * Sign in with Google OAuth
   */
  static async signInWithGoogle(): Promise<{
    error: AuthError | null;
  }> {
    try {
      const supabase = await this.supabase();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch {
      return { error: { message: 'An unexpected error occurred' } };
    }
  }

  /**
   * Request password reset email
   */
  static async requestPasswordReset(email: string): Promise<{
    success: boolean;
    error: AuthError | null;
  }> {
    try {
      const supabase = await this.supabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: { message: error.message },
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch {
      return {
        success: false,
        error: { message: 'An unexpected error occurred' },
      };
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(newPassword: string): Promise<{
    success: boolean;
    error: AuthError | null;
  }> {
    try {
      const supabase = await this.supabase();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: { message: error.message },
        };
      }

      return {
        success: true,
        error: null,
      };
    } catch {
      return {
        success: false,
        error: { message: 'An unexpected error occurred' },
      };
    }
  }
}
