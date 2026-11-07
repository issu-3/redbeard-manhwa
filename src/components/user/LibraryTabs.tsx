'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bookmark, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const LIBRARY_TABS = [
  { href: '/user/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/user/history', label: 'History', icon: History },
] as const;

export function LibraryTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Library"
      className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border"
    >
      {LIBRARY_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isActive
                ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
