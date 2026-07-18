import { ReactNode } from 'react';
import Link from 'next/link';
import { User, Bookmark, History, Settings, ChevronRight } from 'lucide-react';

const navItems = [
  { name: 'Profile', href: '/user/profile', icon: User },
  { name: 'Bookmarks', href: '/user/bookmarks', icon: Bookmark },
  { name: 'History', href: '/user/history', icon: History },
  { name: 'Settings', href: '/user/settings', icon: Settings },
];

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 rounded-xl border border-border bg-card p-4 shadow-sm">
            <h2 className="mb-4 px-2 text-lg font-semibold tracking-tight">Account</h2>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground text-muted-foreground"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
