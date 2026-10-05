'use client';

import { Play, RefreshCw, FileCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useTransition } from 'react';
import { runSeoAudit, regenerateSitemap, validateStructuredData, exportSeoReport } from '@/app/actions/admin/seo-actions';

export function QuickActions() {
  const [isPending, startTransition] = useTransition();

  const handleAction = async (actionFn: () => Promise<any>, name: string) => {
    startTransition(async () => {
      try {
        const result = await actionFn();
        if (result?.success) {
          if (result.data) {
            // It's a download
            const blob = new Blob([result.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.filename;
            a.click();
            window.URL.revokeObjectURL(url);
            toast.success(`Exported ${result.filename}`);
          } else {
            toast.success(result.message);
          }
        } else {
          toast.error(`Failed to execute ${name}`);
        }
      } catch (e) {
        toast.error(`Error: ${(e as Error).message}`);
      }
    });
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
      <ActionButton 
        icon={<Play className="h-4 w-4" />} 
        label="Run SEO Audit" 
        onClick={() => handleAction(runSeoAudit, 'SEO Audit')}
        disabled={isPending}
      />
      <ActionButton 
        icon={<RefreshCw className="h-4 w-4" />} 
        label="Regenerate Sitemap" 
        onClick={() => handleAction(regenerateSitemap, 'Sitemap Regeneration')}
        disabled={isPending}
      />
      <ActionButton 
        icon={<FileCheck className="h-4 w-4" />} 
        label="Validate Structured Data" 
        onClick={() => handleAction(validateStructuredData, 'Structured Data Validation')}
        disabled={isPending}
      />
      <ActionButton 
        icon={<Download className="h-4 w-4" />} 
        label="Export SEO Report" 
        onClick={() => handleAction(exportSeoReport, 'Export SEO Report')}
        disabled={isPending}
      />
    </div>
  );
}

function ActionButton({ icon, label, onClick, disabled }: { icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-surface hover:bg-surface/70 border border-border rounded-lg text-sm font-medium text-text-primary transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {label}
    </button>
  );
}
