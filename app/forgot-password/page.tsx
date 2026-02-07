'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface Message {
  type: 'success' | 'error' | 'info';
  text: string;
}

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [countdown, setCountdown] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const { error } = await resetPassword(email.trim());
    
    if (error) {
      // Handle rate limit error specifically
      if (error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('over email')) {
        setMessage({ 
          type: 'error', 
          text: 'Too many requests. Please wait a few minutes before requesting another reset email.' 
        });
        // Start countdown
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (error.toLowerCase().includes('user not found')) {
        // Don't reveal if email exists for security
        setSuccess(true);
        setMessage({ 
          type: 'success', 
          text: `If an account exists with ${email}, a password reset link has been sent.` 
        });
      } else {
        setMessage({ type: 'error', text: error });
      }
    } else {
      setSuccess(true);
      setMessage({ 
        type: 'success', 
        text: `Password reset link sent to ${email}. Please check your inbox and spam folder.` 
      });
    }

    setIsLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Click the link in the email to reset your password. If you don&apos;t see the email, check your spam folder.
            </p>
            <Button 
              onClick={() => window.location.href = '/login/'} 
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <button
            onClick={() => window.location.href = '/login/'}
            className="absolute left-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading || countdown > 0}
              />
            </div>
            
            {message && (
              <div className={`p-3 border rounded-md ${message.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex items-start gap-2">
                  {message.type === 'error' ? (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <p className={`text-sm ${message.type === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
                    {message.text}
                  </p>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || countdown > 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : countdown > 0 ? (
                `Wait ${countdown}s`
              ) : (
                'Send Reset Link'
              )}
            </Button>
            
            <div className="text-center">
              <button 
                type="button"
                onClick={() => window.location.href = '/login/'}
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
