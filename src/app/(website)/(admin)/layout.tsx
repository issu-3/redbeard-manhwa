import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { auth } from '@/auth';
import { DesktopSidebar, MobileDrawer } from '@/components/admin/AdminSidebar';

// OPT-22: Removed force-dynamic to allow individual admin pages to cache appropriately

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Block unauthenticated users
  if (!session?.user) {
    redirect('/login');
  }

  // Block non-admin/moderator users
  if (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR') {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar (hidden on mobile) */}
      <DesktopSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile & Tablet Header (hidden on lg+) */}
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md lg:hidden shadow-sm">
          <div className="flex items-center gap-3">
            <MobileDrawer />
            <Link href="/admin" className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tighter text-primary">REDBEARD</span>
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                ADMIN
              </span>
            </Link>
          </div>
          {/* Removed the arbitrary red Add button from global mobile header */}
        </header>

        {/* Desktop Topbar (hidden on mobile) */}
        <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-end border-b border-border bg-card/80 px-6 backdrop-blur-md">
          <div className="text-sm text-text-secondary">
            Logged in as <span className="font-semibold text-text-primary">{session?.user?.name || (session?.user?.role === 'ADMIN' ? 'Administrator' : 'Moderator')}</span>
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
