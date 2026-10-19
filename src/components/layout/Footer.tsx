import Link from 'next/link';
import Image from 'next/image';
import { MonitorPlay as Youtube, Camera as Instagram, Send, Video } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';
import { cn } from '@/lib/utils';

export async function Footer({ className }: { className?: string } = {}) {
  const settings = await getCachedSettings();
  
  const hasSocials = settings.youtubeUrl || settings.telegramUrl || settings.instagramUrl || settings.tiktokUrl;

  return (
    <footer className={cn("relative mt-auto border-t border-border bg-surface hidden md:block", className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="pt-6 sm:pt-7 pb-3.5 sm:pb-4 flex flex-col items-center justify-center text-center">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg overflow-hidden shadow-md shadow-primary/20">
              <Image src="/images/logo.jpg" alt="REDBEARD Logo" fill className="object-cover" />
            </div>
            <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-xl sm:text-2xl font-extrabold tracking-tight text-transparent">
              {APP_NAME}
            </span>
          </Link>
          <p className="mt-2.5 text-xs sm:text-sm leading-snug text-text-muted max-w-[450px]">
            {APP_TAGLINE}. Discover thousands of series titles with the smoothest reading experience.
          </p>

          {hasSocials && (
            <div className="mt-3.5 flex items-center justify-center gap-2.5">
              {settings.youtubeUrl && (
                <a
                  href={settings.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                  title="YouTube"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              )}
              {settings.telegramUrl && (
                <a
                  href={settings.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-blue-500/10 hover:text-blue-500"
                  title="Telegram"
                  aria-label="Telegram"
                >
                  <Send className="h-4.5 w-4.5 ml-0.5" />
                </a>
              )}
              {settings.instagramUrl && (
                <a
                  href={settings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-pink-500/10 hover:text-pink-500"
                  title="Instagram"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings.tiktokUrl && (
                <a
                  href={settings.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-text-primary/10 hover:text-text-primary"
                  title="TikTok"
                  aria-label="TikTok"
                >
                  <Video className="h-5 w-5" />
                </a>
              )}
            </div>
          )}

          {/* SEO: Crawlable internal navigation links */}
          <nav
            aria-label="Browse"
            className={cn(
              'flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5 gap-y-1.5 text-xs text-text-muted',
              hasSocials ? 'mt-5 sm:mt-5.5' : 'mt-4'
            )}
          >
            <Link href="/browse/trending" className="transition-colors hover:text-text-primary">Trending</Link>
            <Link href="/browse/popular" className="transition-colors hover:text-text-primary">Popular</Link>
            <Link href="/browse/latest" className="transition-colors hover:text-text-primary">Latest</Link>
            <Link href="/browse/completed" className="transition-colors hover:text-text-primary">Completed</Link>
            <Link href="/browse/new-releases" className="transition-colors hover:text-text-primary">New Releases</Link>
            <Link href="/browse/genres" className="transition-colors hover:text-text-primary">Genres</Link>
            <Link href="/archive" className="transition-colors hover:text-text-primary">Series Directory</Link>
            <Link href="/feed.xml" className="transition-colors hover:text-text-primary">RSS Feed</Link>
          </nav>

          <p className="mt-4 sm:mt-4.5 text-xs text-text-muted">
            &copy; 2026 {APP_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
