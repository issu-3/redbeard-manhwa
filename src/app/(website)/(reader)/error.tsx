'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Main route boundary caught error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 rounded-full bg-red-500/10 p-6">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-text-primary">Something went wrong</h2>
      <p className="mb-8 max-w-md text-text-secondary">
        We encountered an issue loading this page. Please try again.
        {process.env.NODE_ENV === 'development' && (
          <span className="mt-2 block rounded bg-background p-2 text-left text-xs font-mono text-red-400">
            {error.message}
          </span>
        )}
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <RefreshCcw className="h-4 w-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg bg-foreground/5 px-6 py-3 font-semibold text-text-primary transition-colors hover:bg-foreground/10"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
