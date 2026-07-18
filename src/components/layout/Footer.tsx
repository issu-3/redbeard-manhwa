import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const FOOTER_LINKS = {
  Browse: [
    { label: 'Trending', href: '/browse/trending' },
    { label: 'Popular', href: '/browse/popular' },
    { label: 'Latest Updates', href: '/browse/latest' },
    { label: 'Genres', href: '/browse/genres' },
    { label: 'Completed', href: '/browse/completed' },
    { label: 'New Releases', href: '/browse/new' },
  ],
  Community: [
    { label: 'Forums', href: '/community/forums' },
    { label: 'Reviews', href: '/community/reviews' },
    { label: 'Leaderboard', href: '/community/leaderboard' },
    { label: 'Discord', href: 'https://discord.gg/redbeard' },
    { label: 'Blog', href: '/blog' },
  ],
  Support: [
    { label: 'Help Center', href: '/support/help' },
    { label: 'Contact Us', href: '/support/contact' },
    { label: 'Report Issue', href: '/support/report' },
    { label: 'FAQ', href: '/support/faq' },
    { label: 'Status', href: '/support/status' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/legal/terms' },
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'DMCA', href: '/legal/dmca' },
    { label: 'Cookie Policy', href: '/legal/cookies' },
  ],
};

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { label: 'Twitter', href: 'https://twitter.com/redbeard', Icon: TwitterIcon },
  { label: 'Discord', href: 'https://discord.gg/redbeard', Icon: DiscordIcon },
  { label: 'GitHub', href: 'https://github.com/redbeard', Icon: GitHubIcon },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto hidden border-t border-border bg-surface md:block">
      {/* Gradient accent line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

      <div className="mx-auto max-w-7xl px-4 lg:px-6">
        {/* Top section: logo + newsletter */}
        <div className="flex flex-col gap-8 border-b border-border py-12 lg:flex-row lg:items-start lg:justify-between">
          {/* Logo & tagline */}
          <div className="max-w-sm">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
                <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="bg-gradient-to-r from-white to-text-secondary bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">
                {APP_NAME}
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">
              {APP_TAGLINE}. Discover thousands of manhwa, manga, and webtoon
              titles with the smoothest reading experience.
            </p>

            {/* Social Icons */}
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-text-muted transition-all duration-200 hover:bg-white/[0.08] hover:text-white hover:scale-110"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter */}
          <div className="max-w-md lg:text-right">
            <h3 className="text-sm font-semibold text-white">
              Stay in the loop
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Get notified about new releases and updates.
            </p>
            <div
              className="mt-4 flex gap-2"
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-white placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="button"
                className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30"
              >
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted transition-colors duration-200 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border py-6 sm:flex-row">
          <p className="text-xs text-text-muted">
            &copy; {currentYear} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/legal/terms"
              className="text-xs text-text-muted transition-colors hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/legal/privacy"
              className="text-xs text-text-muted transition-colors hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="/legal/dmca"
              className="text-xs text-text-muted transition-colors hover:text-white"
            >
              DMCA
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
