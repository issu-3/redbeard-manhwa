'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/app/actions/public/auth';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Invalid token. Please request a new reset link.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await resetPassword(token, password);
      if (result.success) {
        toast.success('Password successfully reset! You can now log in.');
        router.push('/login');
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto text-center p-8 bg-surface/50 border border-border rounded-xl backdrop-blur-xl">
        <h1 className="text-xl font-bold text-red-500 mb-2">Invalid Link</h1>
        <p className="text-text-muted mb-6">No reset token found in the URL. Please request a new password reset link.</p>
        <Button onClick={() => router.push('/forgot-password')}>Go to Forgot Password</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface/50 border border-border p-8 rounded-xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">Reset Password</h1>
          <p className="text-text-muted mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">New Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">Confirm Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-background"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-6"
            disabled={isSubmitting || !password || !confirmPassword}
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto text-center p-8 bg-surface/50 border border-border rounded-xl">
        Loading...
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
