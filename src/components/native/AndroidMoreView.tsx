'use client';

import { Settings, DownloadCloud, HelpCircle, Info, ChevronRight, Moon, LogOut } from 'lucide-react';
import Link from 'next/link';

export function AndroidMoreView() {
  return (
    <div className="flex h-screen w-full flex-col bg-surface pt-[env(safe-area-inset-top,0px)] pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center px-4 py-4">
        <h1 className="text-xl font-bold text-text-primary">More</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated overflow-hidden">
          <MoreItem icon={<DownloadCloud />} label="Download queue" href="/downloads" />
          <div className="h-[1px] w-full bg-border-subtle ml-12" />
          <MoreItem icon={<Settings />} label="Settings" href="/settings" />
        </div>

        <div className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated overflow-hidden">
          <MoreItem icon={<Moon />} label="Theme" onClick={() => {}} />
        </div>

        <div className="mb-6 rounded-xl border border-border-subtle bg-surface-elevated overflow-hidden">
          <MoreItem icon={<HelpCircle />} label="Help & Support" href="/support" />
          <div className="h-[1px] w-full bg-border-subtle ml-12" />
          <MoreItem icon={<Info />} label="About" href="/about" />
        </div>
      </div>
    </div>
  );
}

function MoreItem({ 
  icon, 
  label, 
  href, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  href?: string; 
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-text-muted">{icon}</div>
        <span className="font-medium text-text-primary">{label}</span>
      </div>
      <ChevronRight className="h-5 w-5 text-text-muted" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}
