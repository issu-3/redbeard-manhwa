'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Library, Compass, MoreHorizontal } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function AndroidBottomNav() {
  const pathname = usePathname();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  if (!isNative) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] items-center justify-around bg-surface border-t border-border-subtle pb-[env(safe-area-inset-bottom,0px)] px-2 native-only-flex shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <NavItem
        href="/library"
        icon={<Library className="h-[22px] w-[22px]" strokeWidth={2.5} />}
        label="Library"
        isActive={pathname === '/library' || pathname === '/'}
      />
      <NavItem
        href="/browse"
        icon={<Compass className="h-[22px] w-[22px]" strokeWidth={2.5} />}
        label="Browse"
        isActive={pathname?.startsWith('/browse')}
      />
      <NavItem
        href="/more"
        icon={<MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={2.5} />}
        label="More"
        isActive={pathname?.startsWith('/more')}
      />
    </nav>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full transition-colors active:scale-95",
        isActive ? "text-primary" : "text-text-muted hover:text-text-primary"
      )}
    >
      <div className={cn(
        "flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200",
        isActive ? "bg-primary/20 text-primary" : "bg-transparent"
      )}>
        {icon}
      </div>
      <span className={cn(
        "text-[11px] font-semibold tracking-wide transition-all",
        isActive ? "font-bold text-primary" : "font-medium"
      )}>{label}</span>
    </Link>
  );
}
