'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; existingAccount?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabaseBrowser.auth.getSession().then(({ data: { session } }: { data: { session: { user: { id: string } } | null } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_event: string, session: { user: { id: string } } | null) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabaseBrowser
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Profile might not exist yet, create it
        const { data: authUser } = await supabaseBrowser.auth.getUser();
        if (authUser.user) {
          const { error: insertError } = await supabaseBrowser
            .from('profiles')
            .insert({
              id: userId,
              name: authUser.user.email?.split('@')[0] || 'User',
              role: 'user',
            });
          
          if (!insertError) {
            setUser({
              id: userId,
              email: authUser.user.email || '',
              name: authUser.user.email?.split('@')[0] || 'User',
              role: 'user',
              created_at: new Date().toISOString(),
            });
          }
        }
      } else {
        const { data: authUser } = await supabaseBrowser.auth.getUser();
        setUser({
          id: userId,
          email: authUser.user?.email || '',
          name: data.name,
          role: data.role,
          created_at: data.created_at,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  async function signUp(email: string, password: string, name: string): Promise<{ error: string | null; existingAccount?: boolean }> {
    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://malik-moneyflow.vercel.app/login/',
        },
      });

      if (error) {
        return { error: error.message };
      }

      // Check if user already exists (Supabase returns empty identities for existing users)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { error: 'An account with this email already exists. Please sign in instead.', existingAccount: true };
      }

      if (data.user) {
        // Create profile
        await supabaseBrowser.from('profiles').insert({
          id: data.user.id,
          name,
          role: 'user',
        });
      }

      return { error: null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setUser(null);
  }

  async function resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://malik-moneyflow.vercel.app/reset-password/',
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  async function updatePassword(password: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabaseBrowser.auth.updateUser({
        password,
      });
      return { error: error?.message || null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
