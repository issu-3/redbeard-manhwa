import Link from 'next/link';
import Image from 'next/image';
import { MonitorPlay as Youtube, Camera as Instagram, Send, Video } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { getCachedSettings } from '@/app/actions/public/settings';

export async function Footer() {
  const settings = await getCachedSettings();
  
  const hasSocials = settings.youtubeUrl || settings.telegramUrl || settings.instagramUrl || settings.tiktokUrl;

  return (
    <footer className="relative mt-auto hidden border-t border-border bg-surface md:block">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Link href="/" className="group inline-flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-primary/20">
              <Image src="/images/logo.jpg" alt="REDBEARD Logo" fill className="object-cover" />
            </div>
            <span className="bg-gradient-to-r from-text-primary to-text-secondary bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
              {APP_NAME}
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-text-muted max-w-md">
            {APP_TAGLINE}. Discover thousands of manhwa, manga, and webtoon
            titles with the smoothest reading experience.
          </p>

          {hasSocials && (
            <div className="mt-6 flex items-center justify-center gap-4">
              {settings.youtubeUrl && (
                <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500" title="YouTube">
                  <Youtube className="h-5 w-5" />
                </a>
              )}
              {settings.telegramUrl && (
                <a href={settings.telegramUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-blue-500/10 hover:text-blue-500" title="Telegram">
                  <Send className="h-5 w-5 ml-0.5" />
                </a>
              )}
              {settings.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-pink-500/10 hover:text-pink-500" title="Instagram">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {settings.tiktokUrl && (
                <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover text-text-muted transition-colors hover:bg-text-primary/10 hover:text-text-primary" title="TikTok">
                  <Video className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
