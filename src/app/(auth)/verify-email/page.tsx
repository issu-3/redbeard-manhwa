'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { verifyEmail } from '@/app/actions/public/auth';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token found in URL.');
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const result = await verifyEmail(token as string);
        if (!isMounted) return;
        
        if (result.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Failed to verify email.');
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage('An unexpected error occurred.');
        }
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text mb-2">Verifying Email...</h1>
        <p className="text-text-muted">Please wait while we verify your email address.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text mb-2">Email Verified!</h1>
        <p className="text-text-muted mb-8">
          Thank you for verifying your email address. Your account is now fully active.
        </p>
        <Button asChild className="w-full">
          <Link href="/login">Continue to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-text mb-2">Verification Failed</h1>
      <p className="text-text-muted mb-8">{errorMessage}</p>
      <Button asChild variant="outline" className="w-full">
        <Link href="/login">Return to Login</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-surface/50 border border-border p-8 rounded-xl backdrop-blur-xl">
        <Suspense fallback={
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-text mb-2">Loading...</h1>
          </div>
        }>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
