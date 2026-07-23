import { MonitorPlay as Youtube } from 'lucide-react';

interface SubscribeCardProps {
  youtubeUrl: string | null;
  className?: string;
}

export function SubscribeCard({ youtubeUrl, className = '' }: SubscribeCardProps) {
  if (!youtubeUrl) return null;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600/10 via-surface to-surface border border-red-500/20 p-6 sm:p-8 ${className}`}>
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-red-500/5 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-red-500/5 blur-2xl" />

      <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:text-left">
        <div className="mb-6 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 sm:mb-0 sm:mr-6">
          <Youtube className="h-8 w-8" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            Subscribe to REDBEARD
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
            Get notified about new series, behind-the-scenes content, and exclusive manhwa recommendations.
          </p>
        </div>

        <div className="mt-6 sm:mt-0 sm:ml-6">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition-all hover:bg-red-700 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20"
          >
            <span className="relative z-10 flex items-center gap-2">
              <Youtube className="h-5 w-5" />
              Subscribe Now
            </span>
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          </a>
        </div>
      </div>
    </div>
  );
}
