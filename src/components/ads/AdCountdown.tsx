'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, Clock } from 'lucide-react';

export function AdCountdown({ downloadUrl }: { downloadUrl: string }) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  if (timeLeft > 0) {
    return (
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <Clock className="w-8 h-8 text-text-muted" />
        <p className="text-text-secondary font-medium">
          Please wait <span className="text-primary font-bold">{timeLeft}</span> seconds...
        </p>
      </div>
    );
  }

  return (
    <Link 
      href={downloadUrl}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-bold text-white transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25"
    >
      <ArrowDownToLine className="h-5 w-5" />
      Continue to Download
    </Link>
  );
}
