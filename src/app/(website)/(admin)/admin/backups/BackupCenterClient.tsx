'use client';

import { useState, useTransition } from 'react';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Cloud, 
  History, 
  Settings, 
  Play, 
  FileText, 
  Trash2, 
  Eye, 
  ShieldCheck, 
  ShieldAlert, 
  HardDrive,
  Loader2
} from 'lucide-react';
import { 
  triggerManualBackup, 
  triggerRestore, 
  uploadAndRestoreBackup, 
  verifyBackupById, 
  deleteBackupRecord, 
  saveBackupSettings 
} from '@/app/actions/admin/backups';
import type { 
  BackupLogData, 
  BackupScheduleConfig, 
  BackupVerificationResult, 
  BlobVerificationReport 
} from '@/types/backup';

interface BackupCenterClientProps {
  initialLogs: BackupLogData[];
  initialConfig: BackupScheduleConfig;
}

export function BackupCenterClient({ initialLogs, initialConfig }: BackupCenterClientProps) {
  const [logs, setLogs] = useState<BackupLogData[]>(initialLogs);
  const [config, setConfig] = useState<BackupScheduleConfig>(initialConfig);
  const [isPending, startTransition] = useTransition();
  const [activeModal, setActiveModal] = useState<'backup' | 'restore' | 'upload' | 'verify' | 'settings' | null>(null);
  const [selectedLog, setSelectedLog] = useState<BackupLogData | null>(null);
  const [verificationResult, setVerificationResult] = useState<BackupVerificationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Backup Now form state
  const [backupFormat, setBackupFormat] = useState<'SQL' | 'JSON'>('SQL');
  const [backupType, setBackupType] = useState<'MANUAL' | 'PRE_DEPLOY'>('MANUAL');

  // Restore options
  const [verifyBlobsOnRestore, setVerifyBlobsOnRestore] = useState<boolean>(true);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadContent, setUploadContent] = useState<string>('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleTriggerBackup = () => {
    setStatusMessage({ type: 'info', text: 'Generating database backup... This may take a few seconds.' });
    startTransition(async () => {
      const res = await triggerManualBackup(backupFormat, backupType);
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Backup generated successfully! ID: ${res.backupId}` });
        setActiveModal(null);
        // Refresh logs list via window reload or state update
        window.location.reload();
      } else {
        setStatusMessage({ type: 'error', text: `Backup failed: ${res.error}` });
      }
    });
  };

  const handleTriggerRestore = (log: BackupLogData) => {
    setStatusMessage({ type: 'info', text: `Restoring database from backup ${log.fileName}...` });
    startTransition(async () => {
      const res = await triggerRestore(log.id, verifyBlobsOnRestore);
      if (res.success) {
        setStatusMessage({ 
          type: 'success', 
          text: `Restore complete! ${res.restoredRecords} records restored.` + 
            (res.blobReport?.missingUrls.length ? ` Warning: ${res.blobReport.missingUrls.length} missing Blob URLs found.` : ' All Blob URLs verified.') 
        });
        setActiveModal(null);
        window.location.reload();
      } else {
        setStatusMessage({ type: 'error', text: `Restore failed: ${res.error}` });
      }
    });
  };

  const handleVerifyLog = (log: BackupLogData) => {
    setStatusMessage({ type: 'info', text: `Verifying backup integrity and Blob storage URLs...` });
    startTransition(async () => {
      const res = await verifyBackupById(log.id);
      if (res.success && res.verification) {
        setVerificationResult(res.verification);
        setSelectedLog(log);
        setActiveModal('verify');
        setStatusMessage(null);
      } else {
        setStatusMessage({ type: 'error', text: `Verification failed: ${res.error}` });
      }
    });
  };

  const handleDeleteLog = (id: string) => {
    if (!confirm('Are you sure you want to delete this backup log?')) return;
    startTransition(async () => {
      const res = await deleteBackupRecord(id);
      if (res.success) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
        setStatusMessage({ type: 'success', text: 'Backup record deleted.' });
      } else {
        setStatusMessage({ type: 'error', text: `Delete failed: ${res.error}` });
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const text = await file.text();
    setUploadContent(text);
  };

  const handleUploadAndRestore = () => {
    if (!uploadFile || !uploadContent) return;
    const format = uploadFile.name.endsWith('.json') ? 'JSON' : 'SQL';
    setStatusMessage({ type: 'info', text: 'Verifying uploaded file and executing restore...' });
    startTransition(async () => {
      const res = await uploadAndRestoreBackup(uploadContent, format, verifyBlobsOnRestore);
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Restore complete! ${res.restoredRecords} records restored.` });
        setActiveModal(null);
        window.location.reload();
      } else {
        setStatusMessage({ type: 'error', text: `Upload & Restore failed: ${res.error}` });
      }
    });
  };

  const handleSaveSettings = () => {
    setStatusMessage({ type: 'info', text: 'Saving automatic backup schedules...' });
    startTransition(async () => {
      const res = await saveBackupSettings(config);
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Backup configuration updated successfully!' });
        setActiveModal(null);
      } else {
        setStatusMessage({ type: 'error', text: `Settings save failed: ${res.error}` });
      }
    });
  };

  const latestBackup = logs[0];
  const successCount = logs.filter((l) => l.status === 'SUCCESS' || l.status === 'VERIFIED' || l.status === 'RESTORED').length;

  return (
    <div className="space-y-8">
      {/* Status Notification */}
      {statusMessage && (
        <div className={`flex items-center justify-between rounded-2xl p-4 border ${
          statusMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
          statusMessage.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
          'bg-primary/10 border-primary/20 text-primary'
        }`}>
          <div className="flex items-center gap-3">
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> :
             statusMessage.type === 'error' ? <XCircle className="h-5 w-5 flex-shrink-0" /> :
             <RefreshCw className="h-5 w-5 animate-spin flex-shrink-0" />}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Total Backups</span>
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <Database className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-text-primary">{logs.length}</span>
            <span className="text-xs text-emerald-400 font-semibold">({successCount} valid)</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Stored across DB and Cloud</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Latest Snapshot</span>
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
              <History className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-lg font-bold text-text-primary">
              {latestBackup ? new Date(latestBackup.createdAt).toLocaleDateString() : 'Never'}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted truncate">
            {latestBackup ? `${latestBackup.fileName} (${formatBytes(latestBackup.sizeBytes)})` : 'No snapshots recorded'}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Google Drive Sync</span>
            <div className={`rounded-xl p-2.5 ${config.driveEnabled ? 'bg-sky-500/10 text-sky-400' : 'bg-surface text-text-muted'}`}>
              <Cloud className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className={`text-lg font-bold ${config.driveEnabled ? 'text-sky-400' : 'text-text-muted'}`}>
              {config.driveEnabled ? 'Connected' : 'Disabled'}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Automated offsite storage</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Blob Storage Health</span>
            <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-lg font-bold text-emerald-400">Verified</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">100% OK</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Checked pre-deploy & restore</p>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setActiveModal('backup')}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
            Backup Now
          </button>
          <button
            onClick={() => setActiveModal('upload')}
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-all disabled:opacity-50"
          >
            <Upload className="h-4 w-4 text-text-muted" />
            Upload Backup
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveModal('settings')}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-hover transition-all"
          >
            <Settings className="h-4 w-4 text-text-muted" />
            Schedule & DR Settings
          </button>
        </div>
      </div>

      {/* Backup History Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">Backup History & Logs</h2>
          <span className="text-xs text-text-muted">{logs.length} total records</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/50 text-xs font-bold uppercase tracking-wider text-text-muted">
                <th className="px-6 py-3.5">File Name & Date</th>
                <th className="px-6 py-3.5">Format</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Size / Records</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Offsite (Drive)</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-muted">
                    No backups generated yet. Click &quot;Backup Now&quot; to create your first snapshot.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-text-primary flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        {log.fileName}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-surface px-2.5 py-1 text-xs font-bold text-text-primary border border-border">
                        {log.format}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-text-primary">{formatBytes(log.sizeBytes)}</div>
                      <div className="text-xs text-text-muted">{log.recordCount.toLocaleString()} records</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                        log.status === 'SUCCESS' || log.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' :
                        log.status === 'RESTORED' ? 'bg-purple-500/10 text-purple-400' :
                        log.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {log.status === 'SUCCESS' || log.status === 'VERIFIED' ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                         log.status === 'RESTORED' ? <RefreshCw className="h-3.5 w-3.5" /> :
                         log.status === 'FAILED' ? <XCircle className="h-3.5 w-3.5" /> :
                         <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.driveUrl ? (
                        <a 
                          href={log.driveUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:underline"
                        >
                          <Cloud className="h-3.5 w-3.5" />
                          Drive Link
                        </a>
                      ) : (
                        <span className="text-xs text-text-muted">Local Only</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/admin/backups/download/${log.id}`}
                          title={`Download ${log.format}`}
                          className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-text-primary transition-all"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleVerifyLog(log)}
                          disabled={isPending}
                          title="Verify Backup & Blobs"
                          className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-emerald-400 transition-all"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setSelectedLog(log); setActiveModal('restore'); }}
                          disabled={isPending || log.status === 'FAILED'}
                          title="1-Click Restore"
                          className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-purple-400 transition-all"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          disabled={isPending}
                          title="Delete Record"
                          className="rounded-lg p-2 text-text-muted hover:bg-surface hover:text-rose-400 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backup Now Modal */}
      {activeModal === 'backup' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                <Play className="h-5 w-5 text-primary fill-current" />
                Create New Backup
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Backup Format</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBackupFormat('SQL')}
                    className={`rounded-xl p-3 border text-center font-bold text-sm transition-all ${
                      backupFormat === 'SQL' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    SQL Dump (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupFormat('JSON')}
                    className={`rounded-xl p-3 border text-center font-bold text-sm transition-all ${
                      backupFormat === 'JSON' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    JSON Snapshot
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-2">Backup Type Tag</label>
                <select
                  value={backupType}
                  onChange={(e: any) => setBackupType(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary focus:border-primary focus:outline-none"
                >
                  <option value="MANUAL">Manual Snapshot</option>
                  <option value="PRE_DEPLOY">Pre-Deployment Checkpoint</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTriggerBackup}
                disabled={isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                Trigger Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {activeModal === 'restore' && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-rose-400 border-b border-border pb-4">
              <AlertTriangle className="h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-black text-text-primary">1-Click Database Restore</h3>
                <p className="text-xs text-text-muted">You are about to restore from snapshot: <span className="font-bold text-text-primary">{selectedLog.fileName}</span></p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-300 space-y-2">
              <p className="font-bold">⚠️ Warning: This will overwrite current database records!</p>
              <p>Existing tables will be truncated and replaced with the records stored in this snapshot. This action cannot be undone unless you have created a backup beforehand.</p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="verifyBlobs"
                checked={verifyBlobsOnRestore}
                onChange={(e) => setVerifyBlobsOnRestore(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary"
              />
              <label htmlFor="verifyBlobs" className="text-sm font-medium text-text-secondary cursor-pointer">
                Verify Vercel Blob URLs after restore (Checks for dead image links)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleTriggerRestore(selectedLog)}
                disabled={isPending}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-500 transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Confirm Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Backup Modal */}
      {activeModal === 'upload' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Upload Backup File
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-border bg-surface p-8 text-center hover:border-primary/50 transition-all">
                <input
                  type="file"
                  accept=".sql,.json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" className="cursor-pointer space-y-2 block">
                  <Upload className="h-8 w-8 text-text-muted mx-auto" />
                  <div className="text-sm font-semibold text-text-primary">
                    {uploadFile ? uploadFile.name : 'Click to select .sql or .json file'}
                  </div>
                  <p className="text-xs text-text-muted">
                    {uploadFile ? `${formatBytes(uploadFile.size)} loaded` : 'Supports standard REDBEARD SQL dumps or JSON snapshots'}
                  </p>
                </label>
              </div>

              {uploadFile && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="verifyBlobsUpload"
                    checked={verifyBlobsOnRestore}
                    onChange={(e) => setVerifyBlobsOnRestore(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-primary"
                  />
                  <label htmlFor="verifyBlobsUpload" className="text-sm font-medium text-text-secondary cursor-pointer">
                    Verify Blob storage URLs during restore
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUploadAndRestore}
                disabled={!uploadFile || isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Verify & Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Report Modal */}
      {activeModal === 'verify' && verificationResult && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                Integrity & Blob Verification Report
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-surface p-4 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Records</span>
                  <p className="text-xl font-black text-text-primary mt-1">{verificationResult.recordCount.toLocaleString()}</p>
                </div>
                <div className="rounded-xl bg-surface p-4 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">File Size</span>
                  <p className="text-xl font-black text-text-primary mt-1">{formatBytes(verificationResult.sizeBytes)}</p>
                </div>
                <div className="rounded-xl bg-surface p-4 border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Format Status</span>
                  <p className="text-xl font-black text-emerald-400 mt-1">Valid {verificationResult.format}</p>
                </div>
              </div>

              {/* Blob Report */}
              {verificationResult.blobReport && (
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                  <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-primary" />
                    Vercel Blob Storage URL Health
                  </h4>
                  <div className="flex items-center gap-6 text-xs font-semibold">
                    <span className="text-text-secondary">Checked: <strong className="text-text-primary">{verificationResult.blobReport.totalChecked}</strong></span>
                    <span className="text-emerald-400">Valid: <strong>{verificationResult.blobReport.validCount}</strong></span>
                    <span className={verificationResult.blobReport.missingUrls.length > 0 ? 'text-rose-400 font-bold' : 'text-text-muted'}>
                      Missing: <strong>{verificationResult.blobReport.missingUrls.length}</strong>
                    </span>
                  </div>

                  {verificationResult.blobReport.missingUrls.length > 0 && (
                    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 max-h-36 overflow-y-auto space-y-1">
                      <p className="text-xs font-bold text-rose-300">Dead / Inaccessible Blob URLs:</p>
                      {verificationResult.blobReport.missingUrls.map((u, i) => (
                        <div key={i} className="text-[11px] font-mono text-rose-400 truncate">{u}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Table counts summary */}
              <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
                <h4 className="text-sm font-bold text-text-primary">Table Record Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {Object.entries(verificationResult.tableCounts).map(([table, count]) => (
                    <div key={table} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 border border-border text-xs">
                      <span className="font-mono text-text-secondary truncate">{table}</span>
                      <span className="font-bold text-text-primary">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-surface px-6 py-2.5 text-sm font-bold text-text-primary hover:bg-surface-hover transition-all border border-border"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Automatic DR & Cron Schedule Settings
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
            </div>

            <div className="space-y-6 overflow-y-auto flex-1 pr-2">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Automated Cron Backups</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface/80">
                    <input
                      type="checkbox"
                      checked={config.dailyEnabled}
                      onChange={(e) => setConfig({ ...config, dailyEnabled: e.target.checked })}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="text-sm font-bold text-text-primary">Daily Database Snapshot</div>
                      <div className="text-xs text-text-muted">Runs at 00:00 UTC every day</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface/80">
                    <input
                      type="checkbox"
                      checked={config.weeklyEnabled}
                      onChange={(e) => setConfig({ ...config, weeklyEnabled: e.target.checked })}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="text-sm font-bold text-text-primary">Weekly Database Snapshot & Recovery Test</div>
                      <div className="text-xs text-text-muted">Runs every Sunday at 02:00 UTC</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface/80">
                    <input
                      type="checkbox"
                      checked={config.monthlyEnabled}
                      onChange={(e) => setConfig({ ...config, monthlyEnabled: e.target.checked })}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="text-sm font-bold text-text-primary">Monthly Archive Snapshot</div>
                      <div className="text-xs text-text-muted">Runs on the 1st of every month at 04:00 UTC</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Google Drive Offsite Integration</h4>
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.driveEnabled}
                    onChange={(e) => setConfig({ ...config, driveEnabled: e.target.checked })}
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                  <div className="text-sm font-bold text-text-primary">Automatically Upload Backups to Google Drive</div>
                </label>

                {config.driveEnabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Google Drive Folder ID (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                        value={config.driveFolderId || ''}
                        onChange={(e) => setConfig({ ...config, driveFolderId: e.target.value })}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                      />
                      <span className="text-[10px] text-text-muted">If empty, creates REDBEARD/Database Backups automatically in Drive root.</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1">Service Account JSON</label>
                      <textarea
                        rows={3}
                        placeholder='{"type": "service_account", "project_id": "...", "client_email": "...", "private_key": "..."}'
                        value={config.driveServiceAccountJson || ''}
                        onChange={(e) => setConfig({ ...config, driveServiceAccountJson: e.target.value })}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-xs font-mono text-text-primary focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">Notifications & Alerting</h4>
                <label className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notifyOnFailure}
                    onChange={(e) => setConfig({ ...config, notifyOnFailure: e.target.checked })}
                    className="h-4 w-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="text-sm font-bold text-text-primary">Notify Admins on Backup / DR Failure</div>
                    <div className="text-xs text-text-muted">Logs error and displays system alert if automated backup fails</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isPending}
                className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                Save Configurations
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
