import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Library, 
  BookOpen, 
  Users, 
  MessageSquare, 
  Tags,
  Settings,
  ArrowLeft,
  BarChart3,
  Search
} from 'lucide-react';
import { auth } from '@/auth';
const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'SEO Health', href: '/admin/seo', icon: Search },
  { name: 'Homepage', href: '/admin/homepage', icon: LayoutDashboard },
  { name: 'Series', href: '/admin/series', icon: Library },
  { name: 'Genres & Tags', href: '/admin/metadata', icon: Tags },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Comments', href: '/admin/comments', icon: MessageSquare },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex sticky top-0 h-screen">
        <div className="p-6">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tighter text-primary">REDBEARD</span>
            <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
              ADMIN
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary transition-all hover:bg-primary/10 hover:text-primary"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4 md:hidden">
            <Link href="/admin" className="text-xl font-black text-primary">RB</Link>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="text-sm text-text-secondary">
              Logged in as <span className="font-semibold text-text-primary">{session?.user?.name || session?.user?.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
