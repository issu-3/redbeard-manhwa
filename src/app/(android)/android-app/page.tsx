'use client';

import { useState } from 'react';
import { Library, Compass, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const AndroidLibraryView = dynamic(() => import('@/components/native/AndroidLibraryView').then(mod => mod.AndroidLibraryView), { ssr: false });
const AndroidBrowseView = dynamic(() => import('@/components/native/AndroidBrowseView').then(mod => mod.AndroidBrowseView), { ssr: false });

export default function AndroidAppRoot() {
  const [currentTab, setCurrentTab] = useState<'library' | 'browse' | 'more'>('library');

  return (
    <div className="flex min-h-screen flex-col bg-background pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
      <main className="flex-1 flex flex-col">
        {currentTab === 'library' && <AndroidLibraryView />}
        {currentTab === 'browse' && <AndroidBrowseView />}
        {currentTab === 'more' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <h1 className="text-2xl font-bold text-text-muted">More Settings Coming Soon</h1>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[calc(4.5rem+env(safe-area-inset-bottom,0px))] items-center justify-around bg-surface border-t border-border-subtle pb-[env(safe-area-inset-bottom,0px)] px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
        <NavItem
          icon={<Library className="h-[22px] w-[22px]" strokeWidth={2.5} />}
          label="Library"
          isActive={currentTab === 'library'}
          onClick={() => setCurrentTab('library')}
        />
        <NavItem
          icon={<Compass className="h-[22px] w-[22px]" strokeWidth={2.5} />}
          label="Browse"
          isActive={currentTab === 'browse'}
          onClick={() => setCurrentTab('browse')}
        />
        <NavItem
          icon={<MoreHorizontal className="h-[22px] w-[22px]" strokeWidth={2.5} />}
          label="More"
          isActive={currentTab === 'more'}
          onClick={() => setCurrentTab('more')}
        />
      </nav>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 min-w-[64px] h-full transition-colors active:scale-95 bg-transparent border-none outline-none",
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
    </button>
  );
}
