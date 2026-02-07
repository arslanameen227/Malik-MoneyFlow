'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { passwordSchema } from '@/lib/validation';

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

function ResetPasswordForm() {
  const { updatePassword } = useAuth();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>({ type: 'info', text: 'Verifying reset link...' });
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const accessToken = searchParams.get('token') || searchParams.get('code');
    const refreshToken = searchParams.get('refresh_token') || '';
    const type = searchParams.get('type');

    console.log('Reset password params:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type });

    if (!accessToken) {
      setMessage({ type: 'error', text: 'No reset token found. Please request a new password reset link.' });
      setIsLoading(false);
      return;
    }

    if (type !== 'recovery') {
      setMessage({ type: 'error', text: 'Invalid link type. This link is not for password reset.' });
      setIsLoading(false);
      return;
    }

    supabaseBrowser.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }: { error: Error | null }) => {
        if (error) {
          console.error('Session error:', error);
          setMessage({ 
            type: 'error', 
            text: `Invalid or expired reset link: ${error.message}. Please request a new password reset link.` 
          });
        } else {
          setTokenValid(true);
          setMessage(null);
        }
        setIsLoading(false);
      })
      .catch((err: any) => {
        console.error('Unexpected error:', err);
        setMessage({ 
          type: 'error', 
          text: 'An unexpected error occurred. Please try again or contact support.' 
        });
        setIsLoading(false);
      });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      // Validate passwords
      passwordSchema.parse(password);
      
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: 'Passwords do not match' });
        return;
      }

      setIsLoading(true);
      setMessage(null);

      const { error } = await updatePassword(password);
      if (error) {
        setMessage({ type: 'error', text: error });
      } else {
        setSuccess(true);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.errors?.[0]?.message || 'Invalid password' });
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold">Password Reset!</CardTitle>
            <CardDescription>Your password has been successfully updated</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && !tokenValid && message?.type === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <button
              onClick={() => window.location.href = '/forgot-password'}
              className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold">Invalid Link</CardTitle>
            <CardDescription>{message.text}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/forgot-password'} className="w-full">
              Request New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center relative">
          <button
            onClick={() => window.location.href = '/login'}
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className={`mb-4 p-3 border rounded-md ${message.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start gap-2">
                {message.type === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                ) : (
                  <Loader2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0 animate-spin" />
                )}
                <p className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading || !tokenValid}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || !tokenValid}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || !tokenValid}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => window.location.href = '/login'}
                className="text-sm text-muted-foreground hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Back to Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
