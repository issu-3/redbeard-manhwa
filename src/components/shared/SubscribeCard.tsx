import { MonitorPlay as Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscribeCardProps {
  youtubeUrl: string | null;
  className?: string;
}

export function SubscribeCard({ youtubeUrl, className }: SubscribeCardProps) {
  if (!youtubeUrl) return null;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-600/10 via-surface to-surface p-5 sm:p-6',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/5 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-red-500/5 blur-2xl" />

      <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
        {/* Circular icon container: 52px on mobile, 56px on sm+ */}
        <div className="mb-3 flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-500 sm:mb-0 sm:mr-5 sm:h-14 sm:w-14">
          <Youtube className="h-[26px] w-[26px] sm:h-7 sm:w-7" />
        </div>

        <div className="flex-1">
          <h3 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            Subscribe to REDBEARD
          </h3>
          <p className="mt-1 max-w-[320px] text-sm leading-relaxed text-text-muted line-clamp-2 sm:mt-1.5 sm:max-w-md sm:line-clamp-none">
            Get notified about new series and updates.
          </p>
        </div>

        <div className="mt-4 shrink-0 sm:mt-0 sm:ml-6">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-red-600 px-6 text-base font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:scale-105 hover:bg-red-700 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Youtube className="h-5 w-5" />
              Subscribe Now
            </span>
            <div className="absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </a>
        </div>
      </div>
    </div>
  );
}
