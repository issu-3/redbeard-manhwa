'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getSystemHealth, SystemHealthData } from '@/app/actions/admin/system';
import { refreshHomepageCache } from '@/app/actions/admin/homepage';
import { 
  Database, HardDrive, Cpu, Server, Shield, Key, RefreshCw, CheckCircle2, AlertTriangle, XCircle 
} from 'lucide-react';

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'Healthy' || status === 'Running' || status === 'Enabled' || status === 'Active' || status === 'Configured') {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }
  if (status === 'Warning') {
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  }
  return <XCircle className="h-5 w-5 text-red-500" />;
};

export function SystemHealthPanel() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRefreshingCache, startCacheTransition] = useTransition();
  const [cacheMessage, setCacheMessage] = useState('');

  const fetchHealth = () => {
    startTransition(async () => {
      try {
        const data = await getSystemHealth();
        setHealth(data);
      } catch (err) {
        console.error('Failed to fetch system health:', err);
      }
    });
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleRefreshCache = () => {
    startCacheTransition(async () => {
      try {
        const res = await refreshHomepageCache();
        if (res.success) {
          setCacheMessage('Cache refreshed successfully');
          setTimeout(() => setCacheMessage(''), 3000);
        } else {
          setCacheMessage('Failed to refresh cache');
        }
      } catch (err) {
        setCacheMessage('Error refreshing cache');
      }
    });
  };

  if (!health) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-center h-48">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium">Running System Health Checks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            System Health
          </h2>
          <p className="text-sm text-text-muted">Real-time status of backend services</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {cacheMessage && <span className="text-xs font-medium text-green-500">{cacheMessage}</span>}
          <button 
            onClick={handleRefreshCache}
            disabled={isRefreshingCache}
            className="flex items-center gap-2 bg-surface hover:bg-surface/80 border border-border px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshingCache ? 'animate-spin' : ''}`} />
            Refresh Cache
          </button>
          <button 
            onClick={fetchHealth}
            disabled={isPending}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
            Run Health Check
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Database */}
        <div className="bg-background rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
            <StatusIcon status={health.database.status} />
            <h3 className="font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Database</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Status</span><span className="font-medium">{health.database.status}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Ping</span><span className="font-medium">{health.database.responseTime}{health.database.responseTime !== 'Not Available' ? ' ms' : ''}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Size</span><span className="font-medium">{health.database.size}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Tables</span><span className="font-medium">{health.database.tables}</span></div>
          </div>
        </div>

        {/* Storage */}
        <div className="bg-background rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
            <StatusIcon status="Healthy" />
            <h3 className="font-semibold flex items-center gap-2"><HardDrive className="h-4 w-4" /> Storage</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Provider</span><span className="font-medium">{health.storage.provider}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Total Images</span><span className="font-medium">{health.storage.imagesCount}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Total Covers</span><span className="font-medium">{health.storage.coversCount}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Total Banners</span><span className="font-medium">{health.storage.bannersCount}</span></div>
          </div>
        </div>

        {/* Cache & Server */}
        <div className="bg-background rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
            <StatusIcon status={health.cache.status} />
            <h3 className="font-semibold flex items-center gap-2"><Cpu className="h-4 w-4" /> Cache & Server</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Cache Status</span><span className="font-medium">{health.cache.status}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Uptime</span><span className="font-medium">{health.server.uptime}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Automation</span><span className="font-medium">{health.backgroundJobs.homepageAutomation}</span></div>
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-background rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
            <StatusIcon status={health.authentication.google === 'Configured' || health.authentication.discord === 'Configured' || health.authentication.email === 'Configured' ? 'Healthy' : 'Warning'} />
            <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Authentication</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Google OAuth</span><span className="font-medium">{health.authentication.google}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Discord OAuth</span><span className="font-medium">{health.authentication.discord}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Email Magic Link</span><span className="font-medium">{health.authentication.email}</span></div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-background rounded-lg border border-border p-4 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
            <StatusIcon status={health.security.envMissing.length === 0 ? 'Healthy' : 'Error'} />
            <h3 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4" /> Security</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">HTTPS Mode</span><span className="font-medium">{health.security.https}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Admin Auth</span><span className="font-medium">{health.security.adminAuth}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Required Env Vars</span><span className="font-medium">{health.security.envMissing.length === 0 ? 'All Set' : `${health.security.envMissing.length} Missing`}</span></div>
            {health.security.envMissing.length > 0 && (
              <div className="mt-2 text-xs text-red-500 bg-red-500/10 p-2 rounded">
                Missing: {health.security.envMissing.join(', ')}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
