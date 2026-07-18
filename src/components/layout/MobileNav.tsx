'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Compass, Search, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_NAV_ITEMS } from '@/lib/constants';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Compass,
  Search,
  BookOpen,
  User,
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/80 backdrop-blur-xl safe-bottom md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-1">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon] || Home;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-text-muted'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-1 h-0.5 w-6 rounded-full bg-gradient-to-r from-primary to-accent"
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 30,
                  }}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-primary' : 'text-text-muted'
                  )}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
              </motion.div>

              <span className={cn(isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
