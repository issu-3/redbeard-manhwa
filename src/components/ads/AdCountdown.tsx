'use client';

import { useState, useEffect } from 'react';
import { ArrowDownToLine, Clock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useDownloadStore } from '@/store/download-store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface AdCountdownProps {
  redirectUrl: string;
  chapterId?: string;
  seriesId?: string;
  seriesTitle?: string;
  seriesSlug?: string;
  chapterNumber?: string | number;
}

export function AdCountdown({ redirectUrl, chapterId, seriesId, seriesTitle, seriesSlug, chapterNumber }: AdCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const queueDownload = useDownloadStore(state => state.queueDownload);

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
    <button 
      onClick={async () => {
        if (isProcessing) return;
        
        if (Capacitor.isNativePlatform() && chapterId && seriesId && seriesTitle && seriesSlug) {
          setIsProcessing(true);
          
          queueDownload(chapterId, {
            seriesId,
            seriesTitle,
            seriesSlug,
            chapterNumber: chapterNumber || '1',
            filename: `${seriesSlug}-chapter-${chapterNumber || '1'}.pdf`,
          });
          
          toast.success('Download queued in background');
          router.back();
          return;
        }
        
        // Fallback to normal web flow (or if native fails)
        window.location.href = redirectUrl;
      }}
      disabled={isProcessing}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 font-bold text-white transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/25 disabled:opacity-50"
    >
      <ArrowDownToLine className="h-5 w-5" />
      {isProcessing ? 'Processing...' : 'Continue to Download'}
    </button>
  );
}
