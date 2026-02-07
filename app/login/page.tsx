'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  useEffect(() => {
    // Handle email verification token from URL hash
    const hash = window.location.hash;
    const accessToken = hash.match(/access_token=([^&]*)/)?.[1];
    const refreshToken = hash.match(/refresh_token=([^&]*)/)?.[1];
    const type = hash.match(/type=([^&]*)/)?.[1];

    if (accessToken && type === 'signup') {
      setIsLoading(true);
      supabaseBrowser.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      }).then(({ error }: { error: Error | null }) => {
        if (error) {
          setError('Verification failed. Please try again or contact support.');
        } else {
          setVerified(true);
          // Clear the hash from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setIsLoading(false);
      });
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      setError(error);
    }

    setIsLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { error } = await signUp(registerEmail, registerPassword, registerName);
    if (error) {
      setError(error);
    } else {
      setError('Account created! Please check your email to verify.');
    }

    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Money Trade Manager</CardTitle>
          <CardDescription>Sign in to manage your shop</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot Password?
                    </Link>
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="John Doe"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className={`text-sm ${error.includes('created') ? 'text-green-500' : 'text-red-500'}`}>
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
