import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { auth } from '@/auth';
import { DesktopSidebar, MobileDrawer } from '@/components/admin/AdminSidebar';

// OPT-22: Removed force-dynamic to allow individual admin pages to cache appropriately

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // C2 FIX: Block unauthenticated users
  if (!session?.user) {
    redirect('/login');
  }

  // C2 FIX: Block non-admin/moderator users
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR') {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 lg:h-16 items-center justify-between border-b border-border bg-card/80 px-4 lg:px-6 backdrop-blur-md">
          {/* Mobile: Hamburger + Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            <MobileDrawer />
            <Link href="/admin" className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tighter text-primary">REDBEARD</span>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                ADMIN
              </span>
            </Link>
          </div>

          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Mobile: Compact Add button (visible only on series page via CSS, but always accessible) */}
            <Link
              href="/admin/series/new"
              className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors focus-ring"
              aria-label="Add new series"
            >
              <Plus className="h-4 w-4" />
            </Link>
            <div className="hidden lg:block text-sm text-text-secondary">
              Logged in as <span className="font-semibold text-text-primary">{session?.user?.name || (session?.user?.role === 'ADMIN' ? 'Administrator' : 'Moderator')}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
