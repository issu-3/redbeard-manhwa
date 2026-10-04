'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Library,
  Users,
  MessageSquare,
  Tags,
  Settings,
  ArrowLeft,
  BarChart3,
  Search,
  Star,
  Database,
  Menu,
  X,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Backups & DR', href: '/admin/backups', icon: Database },
  { name: 'SEO Health', href: '/admin/seo', icon: Search },
  { name: 'Homepage', href: '/admin/homepage', icon: LayoutDashboard },
  { name: 'Series', href: '/admin/series', icon: Library },
  { name: 'Genres & Tags', href: '/admin/metadata', icon: Tags },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Comments', href: '/admin/comments', icon: MessageSquare },
  { name: 'Reviews', href: '/admin/reviews', icon: Star },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {navigation.map((item) => {
        const isActive =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? 'bg-primary/15 text-primary'
                : 'text-text-secondary hover:bg-primary/10 hover:text-primary'
            }`}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {item.name}
          </Link>
        );
      })}
    </>
  );
}

/* ── Desktop Sidebar ───────────────────────────── */

export function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col sticky top-0 h-screen">
      <div className="p-6">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tighter text-primary">REDBEARD</span>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
            ADMIN
          </span>
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto thin-scrollbar">
        <NavLinks />
      </nav>
      <div className="p-4 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Site
        </Link>
      </div>
    </aside>
  );
}

/* ── Mobile Drawer ──────────────────────────────── */

export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      {/* Hamburger button — rendered in the mobile header */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center justify-center h-10 w-10 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors focus-ring"
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay + Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <aside
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card border-r border-border shadow-2xl animate-slide-in-left"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link href="/admin" className="flex items-center gap-2" onClick={handleClose}>
                <span className="text-xl font-black tracking-tighter text-primary">REDBEARD</span>
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  ADMIN
                </span>
              </Link>
              <button
                onClick={handleClose}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors focus-ring"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto thin-scrollbar">
              <NavLinks onNavigate={handleClose} />
            </nav>

            <div className="p-3 border-t border-border">
              <Link
                href="/"
                onClick={handleClose}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Site
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
