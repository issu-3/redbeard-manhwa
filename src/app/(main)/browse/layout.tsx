'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, TrendingUp, Clock, BookCheck, Rows3, Sparkles, Grid3x3 } from 'lucide-react';

const browseLinks = [
  { href: '/browse/trending', label: 'Trending', icon: Flame },
  { href: '/browse/popular', label: 'Popular', icon: TrendingUp },
  { href: '/browse/latest', label: 'Latest', icon: Clock },
  { href: '/browse/completed', label: 'Completed', icon: BookCheck },
  { href: '/browse/ongoing', label: 'Ongoing', icon: Rows3 },
  { href: '/browse/new-releases', label: 'New Releases', icon: Sparkles },
  { href: '/browse/genres', label: 'Genres', icon: Grid3x3 },
];

export default function BrowseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 pt-6 pb-16 md:px-8 lg:px-16 xl:px-20">
      {/* Tab navigation */}
      <nav className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-2">
        {browseLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'border border-border bg-card text-text-secondary hover:bg-card-hover hover:text-text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
