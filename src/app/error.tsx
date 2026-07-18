'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-danger/10">
          <svg
            className="h-10 w-10 text-danger"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold font-heading text-text-primary">
          Something went wrong
        </h2>
        <p className="max-w-md text-text-secondary">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-medium text-white gradient-primary transition-all hover:opacity-90 hover:shadow-lg hover:shadow-primary/25"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
