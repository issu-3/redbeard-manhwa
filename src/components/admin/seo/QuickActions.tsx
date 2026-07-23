'use client';

import { Play, RefreshCw, FileCheck, Download } from 'lucide-react';
import { toast } from 'sonner';

export function QuickActions() {
  const handleAction = (name: string) => {
    toast.success(`Action Triggered: ${name}`, {
      description: 'Mock action executed for redesign.'
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
      <ActionButton 
        icon={<Play className="h-4 w-4" />} 
        label="Run SEO Audit" 
        onClick={() => handleAction('Run SEO Audit')} 
      />
      <ActionButton 
        icon={<RefreshCw className="h-4 w-4" />} 
        label="Regenerate Sitemap" 
        onClick={() => handleAction('Regenerate Sitemap')} 
      />
      <ActionButton 
        icon={<FileCheck className="h-4 w-4" />} 
        label="Validate Structured Data" 
        onClick={() => handleAction('Validate Structured Data')} 
      />
      <ActionButton 
        icon={<Download className="h-4 w-4" />} 
        label="Export SEO Report" 
        onClick={() => handleAction('Export SEO Report')} 
      />
    </div>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface/70 border border-border rounded-lg text-sm font-medium text-text-primary transition-colors whitespace-nowrap"
    >
      {icon}
      {label}
    </button>
  );
}
