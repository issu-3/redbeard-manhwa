import Link from 'next/link';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export function Footer() {
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
        </div>
      </div>
    </footer>
  );
}
