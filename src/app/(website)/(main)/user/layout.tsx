import { ReactNode } from 'react';
import { Metadata } from 'next';
import { UserNav } from '@/components/user/UserNav';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Navigation */}
        <aside className="w-full md:w-64 shrink-0">
          <UserNav />
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
