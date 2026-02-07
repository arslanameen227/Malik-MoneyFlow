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
    // Check current session
    supabaseBrowser.auth.getSession().then(({ data: { session } }: { data: { session: { user: { id: string } } | null } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error: any) => {
      console.error('Session check error:', error);
      setLoading(false);
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

    // Failsafe: ensure loading is never stuck for more than 10 seconds
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('⏱️ Loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  async function fetchUserProfile(userId: string) {
    console.log('🔍 Fetching profile for user:', userId);
    try {
      // Try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabaseBrowser
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('❌ Profile fetch error:', fetchError);
        // Try to create profile if it doesn't exist
        await createUserProfile(userId);
      } else if (!existingProfile) {
        console.log('⚠️ No profile found, creating new one...');
        await createUserProfile(userId);
      } else {
        console.log('✅ Profile found:', existingProfile);
        const { data: authUser } = await supabaseBrowser.auth.getUser();
        setUser({
          id: userId,
          email: authUser.user?.email || '',
          name: existingProfile.name,
          role: existingProfile.role,
          created_at: existingProfile.created_at,
        });
      }
    } catch (error) {
      console.error('❌ Error in fetchUserProfile:', error);
    } finally {
      console.log('✅ Setting loading to false');
      setLoading(false);
    }
  }

  async function createUserProfile(userId: string) {
    try {
      const { data: authUser } = await supabaseBrowser.auth.getUser();
      const userName = authUser.user?.email?.split('@')[0] || 'User';
      const userEmail = authUser.user?.email || '';
      
      console.log('📝 Creating new profile for:', userEmail);
      
      const { error: insertError } = await supabaseBrowser
        .from('profiles')
        .insert({
          id: userId,
          name: userName,
          role: 'user',
        });
      
      if (insertError) {
        console.error('❌ Failed to create profile:', insertError);
      } else {
        console.log('✅ Profile created successfully');
        setUser({
          id: userId,
          email: userEmail,
          name: userName,
          role: 'user',
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
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

  async function signUp(email: string, password: string, name: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'https://malik-moneyflow.vercel.app/login',
        },
      });

      if (error) {
        console.error('Auth signup error:', error);
        return { error: error.message };
      }

      if (data.user) {
        console.log('User created in auth, creating profile...');
        // Create profile
        const { error: profileError } = await supabaseBrowser.from('profiles').insert({
          id: data.user.id,
          name,
          role: 'user',
        });
        
        if (profileError) {
          console.error('Profile creation error:', profileError);
          return { error: `Database error: ${profileError.message}` };
        }
        console.log('Profile created successfully');
      }

      return { error: null };
    } catch (error: any) {
      console.error('SignUp catch error:', error);
      return { error: error?.message || 'An unexpected error occurred' };
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
