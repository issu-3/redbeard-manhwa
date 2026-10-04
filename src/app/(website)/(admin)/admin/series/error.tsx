'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function SeriesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Series page error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 px-6 text-center">
      <div className="mb-4 rounded-full bg-red-500/10 p-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-text-primary">Unable to load series</h3>
      <p className="mt-1 text-sm text-text-secondary max-w-xs">
        Something went wrong while loading the series list. Please try again.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors focus-ring"
      >
        <RefreshCcw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
