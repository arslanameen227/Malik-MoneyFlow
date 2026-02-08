'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabaseBrowser } from '@/lib/supabase';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(async (_event: string, session: { user: { id: string } } | null) => {
      if (!mounted) return;

      if (session?.user) {
        await loadUserProfile(session.user.id);
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function loadUserProfile(userId: string) {
    try {
      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const { data: { user: authUser } } = await supabaseBrowser.auth.getUser();

      if (profile) {
        setUser({
          id: userId,
          email: authUser?.email || '',
          name: profile.name,
          role: profile.role,
          created_at: profile.created_at,
        });
      } else {
        const userName = authUser?.email?.split('@')[0] || 'User';
        const { error: insertError } = await supabaseBrowser
          .from('profiles')
          .insert({ id: userId, name: userName, role: 'user' });
        
        if (!insertError) {
          setUser({
            id: userId,
            email: authUser?.email || '',
            name: userName,
            role: 'user',
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
    }
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  }

  async function signUp(email: string, password: string, name: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: 'https://malik-moneyflow.vercel.app/login' },
      });

      if (error) return { error: error.message };

      if (data.user) {
        const { error: profileError } = await supabaseBrowser
          .from('profiles')
          .insert({ id: data.user.id, name, role: 'user' });
        
        if (profileError) {
          return { error: `Database error: ${profileError.message}` };
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'An unexpected error occurred' };
    }
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
