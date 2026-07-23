'use client';

import { CheckCircle2, AlertTriangle, XCircle, SearchCode } from 'lucide-react';

interface AuditItem {
  name: string;
  status: string; // 'pass' | 'warning' | 'fail'
}

export function TechnicalAudit({ auditData }: { auditData: AuditItem[] }) {
  const passed = auditData.filter(i => i.status === 'pass').length;
  const warnings = auditData.filter(i => i.status === 'warning').length;
  const failed = auditData.filter(i => i.status === 'fail').length;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <SearchCode className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Technical SEO Audit</h2>
            <p className="text-sm text-text-secondary">Automated crawler analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          {failed > 0 && <span className="flex items-center gap-1 text-xs font-semibold text-danger bg-danger/10 px-2 py-1 rounded-full"><XCircle className="h-3 w-3" /> {failed}</span>}
          {warnings > 0 && <span className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning/10 px-2 py-1 rounded-full"><AlertTriangle className="h-3 w-3" /> {warnings}</span>}
        </div>
      </div>
      
      <div className="p-0 overflow-y-auto max-h-[400px]">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-border">
            {auditData.map((item, i) => (
              <tr key={i} className="hover:bg-surface/30 transition-colors">
                <td className="px-6 py-3.5 font-medium">{item.name}</td>
                <td className="px-6 py-3.5 text-right">
                  {item.status === 'pass' && <CheckCircle2 className="h-5 w-5 text-success inline-block" />}
                  {item.status === 'warning' && <AlertTriangle className="h-5 w-5 text-warning inline-block" />}
                  {item.status === 'fail' && <XCircle className="h-5 w-5 text-danger inline-block" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
