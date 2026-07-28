import { Metadata } from 'next';
import { getBackupLogs } from '@/app/actions/admin/backups';
import { prisma } from '@/lib/prisma';
import { BackupCenterClient } from './BackupCenterClient';
import type { BackupScheduleConfig } from '@/types/backup';

export const metadata: Metadata = {
  title: 'Disaster Recovery & Backup Center - REDBEARD Admin',
};

export const dynamic = 'force-dynamic';

export default async function BackupsPage() {
  const initialLogs = await getBackupLogs();
  
  let scheduleConfig: BackupScheduleConfig = {
    dailyEnabled: true,
    weeklyEnabled: true,
    monthlyEnabled: true,
    driveEnabled: Boolean(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT),
    notifyOnFailure: true,
  };

  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'backup_config' } });
    if (setting?.value) {
      scheduleConfig = { ...scheduleConfig, ...JSON.parse(setting.value) };
    }
  } catch (e) {
    console.warn('[BackupsPage] Error loading config:', e);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
          Disaster Recovery & Backup Center
        </h1>
        <p className="mt-1 text-text-muted">
          Manage automated snapshots, Google Drive offsite synchronization, verify Blob storage integrity, and execute 1-click restores.
        </p>
      </div>

      <BackupCenterClient initialLogs={initialLogs} initialConfig={scheduleConfig} />
    </div>
  );
}
