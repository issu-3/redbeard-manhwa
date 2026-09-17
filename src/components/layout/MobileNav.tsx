'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, BookOpen, Bell, History, Compass, Search, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MOBILE_NAV_ITEMS, ANDROID_NAV_ITEMS } from '@/lib/constants';
import { Capacitor } from '@capacitor/core';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  BookOpen,
  Bell,
  History,
  Compass,
  Search,
  Settings,
  User,
};

// Use NEXT_PUBLIC_CAPACITOR env var as initial value so the Android shell
// static export renders the correct 3-item nav during SSR/build.
const IS_CAPACITOR_BUILD = process.env.NEXT_PUBLIC_CAPACITOR === 'true';

export function MobileNav() {
  const pathname = usePathname();
  const [isNative, setIsNative] = useState(IS_CAPACITOR_BUILD);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const navItems = isNative ? ANDROID_NAV_ITEMS : MOBILE_NAV_ITEMS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/80 backdrop-blur-xl safe-bottom md:hidden transition-transform duration-300 ease-in-out [.mobile-menu-open_&]:translate-y-[150%]"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || BookOpen;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
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

