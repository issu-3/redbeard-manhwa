'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Bookmark, History, Settings, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { USER_NAV_ITEMS } from '@/lib/constants';

const ICON_MAP: Record<string, React.ElementType> = {
  User,
  Bookmark,
  History,
  Settings,
};

export function UserNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Horizontal Pill Navigation (Compact, saves ~180px vertical space) */}
      <nav
        className="flex md:hidden items-center gap-1.5 p-1 bg-card border border-border rounded-xl overflow-x-auto scrollbar-none"
        aria-label="Account navigation"
      >
        {USER_NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon] || User;
          const isActive =
            pathname === item.href ||
            (item.href !== '/user/profile' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center justify-center gap-2 flex-1 min-w-[85px] py-2 px-3 rounded-lg text-xs font-medium transition-colors shrink-0 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop Sidebar Navigation */}
      <div className="hidden md:block sticky top-24 rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="mb-4 px-2 text-lg font-semibold tracking-tight text-foreground">Account</h2>
        <nav className="flex flex-col gap-1" aria-label="Account pages">
          {USER_NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon] || User;
            const isActive =
              pathname === item.href ||
              (item.href !== '/user/profile' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                <ChevronRight
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isActive ? 'text-primary opacity-100' : 'opacity-40'
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
