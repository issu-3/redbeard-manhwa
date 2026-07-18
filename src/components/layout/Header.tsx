'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Menu,
  X,
  Bell,
  BookOpen,
  User,
  LogIn,
  ChevronDown,
  Bookmark,
  History,
  List,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, USER_NAV_ITEMS, APP_NAME } from '@/lib/constants';

const USER_MENU_ITEMS = USER_NAV_ITEMS.map((item) => {
  const iconMap: Record<string, React.ElementType> = {
    User,
    Bookmark,
    History,
    List,
    Bell,
    Settings,
  };
  return { ...item, Icon: iconMap[item.icon] || User };
});

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: session, status } = useSession();
  const isLoggedIn = status === 'authenticated';
  const user = session?.user;

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Close menus on route change
  useEffect(() => {
    setTimeout(() => {
      setMobileMenuOpen(false);
      setUserMenuOpen(false);
    }, 0);
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = () => setUserMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [userMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-surface/70 backdrop-blur-xl border-b border-border shadow-lg shadow-black/20'
            : 'bg-transparent border-b border-transparent'
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
              <BookOpen className="h-5 w-5 text-white" strokeWidth={2.5} />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-accent opacity-0 blur-md transition-opacity group-hover:opacity-60" />
            </div>
            <span className="bg-gradient-to-r from-white via-white to-text-secondary bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200',
                    isActive
                      ? 'text-white'
                      : 'text-text-secondary hover:text-white'
                  )}
                >
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-white/[0.08]"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Link
              href="/search"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Search"
            >
              <Search className="h-[18px] w-[18px]" />
            </Link>

            {/* Notifications (logged in only) */}
            {isLoggedIn && (
              <button
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              </button>
            )}

            {/* User Menu / Login — Desktop */}
            <div className="hidden md:block">
              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUserMenuOpen(!userMenuOpen);
                    }}
                    className="flex items-center gap-3"
                  >
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name || 'User'}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/50"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary ring-2 ring-primary/50">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold">{user?.name || 'User'}</span>
                      <span className="text-xs text-muted-foreground">{user?.email || 'Premium Member'}</span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'ml-2 h-4 w-4 text-muted-foreground transition-transform duration-200',
                        userMenuOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-border bg-surface/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
                      >
                        {/* User info header */}
                        <div className="mb-1.5 border-b border-border px-3 pb-3 pt-2">
                          <p className="text-sm font-semibold text-white">
                            {user?.name || 'User'}
                          </p>
                          <p className="text-xs text-text-muted">
                            {user?.email}
                          </p>
                        </div>

                        {USER_MENU_ITEMS.map(({ label, href, Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-white"
                          >
                            <Icon className="h-4 w-4" />
                            {label}
                          </Link>
                        ))}

                        <div className="mt-1.5 border-t border-border pt-1.5">
                          <button
                            type="button"
                            onClick={() => signOut()}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
                          >
                            <LogIn className="h-4 w-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary-hover hover:shadow-xl hover:shadow-primary/30"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 z-40 h-full w-[280px] border-l border-border bg-surface/95 backdrop-blur-xl md:hidden"
            >
              <div className="flex h-full flex-col px-5 pt-20">
                {/* Nav Links */}
                <nav className="flex flex-col gap-1">
                  {NAV_ITEMS.map((item, index) => {
                    const isActive =
                      item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href);
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-text-secondary hover:bg-white/[0.04] hover:text-white'
                          )}
                        >
                          {item.label}
                          {isActive && (
                            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Divider */}
                <div className="my-4 h-px bg-border" />

                {/* Auth section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  {isLoggedIn ? (
                    <div className="flex flex-col gap-1">
                      {USER_MENU_ITEMS.slice(0, 4).map(
                        ({ label, href, Icon }) => (
                          <Link
                            key={href}
                            href={href}
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-white"
                          >
                            <Icon className="h-4.5 w-4.5" />
                            {label}
                          </Link>
                        )
                      )}
                    </div>
                  ) : (
                    <Link
                      href="/auth/login"
                      className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary-hover"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </Link>
                  )}
                </motion.div>

                {/* Bottom brand */}
                <div className="mt-auto pb-8">
                  <div className="flex items-center gap-2 text-text-muted">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-xs">{APP_NAME} &copy; 2026</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
