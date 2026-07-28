'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { 
  generateDatabaseDump, 
  restoreDatabaseDump, 
  verifyBackupIntegrity, 
  verifyBlobIntegrity 
} from '@/lib/backup-engine';
import { uploadBackupToDrive } from '@/lib/google-drive';
import type { 
  BackupLogData, 
  BackupScheduleConfig, 
  BackupVerificationResult 
} from '@/types/backup';

async function checkAdminAuth() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized: Admin access required.');
  }
  return session.user;
}

/**
 * Triggers an immediate database backup
 */
export async function triggerManualBackup(
  format: 'SQL' | 'JSON' = 'SQL',
  type: 'MANUAL' | 'PRE_DEPLOY' = 'MANUAL'
): Promise<{ success: boolean; backupId?: string; error?: string }> {
  try {
    await checkAdminAuth();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `redbeard-${type.toLowerCase()}-backup-${timestamp}.${format.toLowerCase()}`;

    // Create initial log
    const log = await prisma.backupLog.create({
      data: {
        fileName,
        format,
        type,
        sizeBytes: 0,
        recordCount: 0,
        status: 'IN_PROGRESS',
      },
    });

    // Generate dump
    const dump = await generateDatabaseDump(format);

    // Upload to Google Drive if configured
    const subfolder = type === 'PRE_DEPLOY' ? 'Pre-Deploy' : 'Manual';
    const driveRes = await uploadBackupToDrive(fileName, dump.content, subfolder);

    // Update log with results
    const updated = await prisma.backupLog.update({
      where: { id: log.id },
      data: {
        sizeBytes: dump.sizeBytes,
        recordCount: dump.recordCount,
        status: 'SUCCESS',
        content: dump.content,
        driveFileId: driveRes.fileId || null,
        driveUrl: driveRes.webViewLink || null,
        metadata: {
          tableCounts: dump.tableCounts,
        } as any,
        completedAt: new Date(),
      },
    });

    revalidatePath('/admin/backups');
    return { success: true, backupId: updated.id };
  } catch (error: any) {
    console.error('[BackupAction] Failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Restores the database from a stored BackupLog
 */
export async function triggerRestore(
  backupId: string,
  verifyBlobs: boolean = true
): Promise<{ success: boolean; restoredRecords?: number; blobReport?: any; error?: string }> {
  try {
    await checkAdminAuth();

    const log = await prisma.backupLog.findUnique({ where: { id: backupId } });
    if (!log || !log.content) {
      throw new Error('Backup file content not found in database storage.');
    }

    const restoreRes = await restoreDatabaseDump(log.content, log.format, verifyBlobs);

    if (restoreRes.success) {
      await prisma.backupLog.update({
        where: { id: backupId },
        data: {
          status: 'RESTORED',
          metadata: {
            ...(log.metadata as any),
            lastRestoredAt: new Date().toISOString(),
            restoreBlobReport: restoreRes.blobReport,
          } as any,
          completedAt: new Date(),
        },
      });
      revalidatePath('/admin/backups');
      return {
        success: true,
        restoredRecords: restoreRes.restoredRecords,
        blobReport: restoreRes.blobReport,
      };
    } else {
      throw new Error(restoreRes.errorMessage || 'Restore operation failed.');
    }
  } catch (error: any) {
    console.error('[RestoreAction] Failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Uploads an external backup file and optionally restores it
 */
export async function uploadAndRestoreBackup(
  content: string,
  format: 'SQL' | 'JSON',
  verifyBlobs: boolean = true
): Promise<{ success: boolean; verification?: BackupVerificationResult; restoredRecords?: number; error?: string }> {
  try {
    await checkAdminAuth();

    // 1. Verify first
    const verification = await verifyBackupIntegrity(content, format);
    if (!verification.valid) {
      return { success: false, verification, error: verification.errorMessage || 'Invalid backup dump format.' };
    }

    // 2. Execute restore
    const restoreRes = await restoreDatabaseDump(content, format, verifyBlobs);
    if (!restoreRes.success) {
      throw new Error(restoreRes.errorMessage || 'Restore failed.');
    }

    // 3. Log event
    await prisma.backupLog.create({
      data: {
        fileName: `uploaded-restore-${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`,
        format,
        type: 'MANUAL',
        sizeBytes: verification.sizeBytes,
        recordCount: verification.recordCount,
        status: 'RESTORED',
        content,
        metadata: {
          tableCounts: verification.tableCounts,
          blobReport: restoreRes.blobReport,
        } as any,
        completedAt: new Date(),
      },
    });

    revalidatePath('/admin/backups');
    return { success: true, verification, restoredRecords: restoreRes.restoredRecords };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Verifies integrity of a stored backup without restoring
 */
export async function verifyBackupById(backupId: string): Promise<{ success: boolean; verification?: BackupVerificationResult; error?: string }> {
  try {
    await checkAdminAuth();
    const log = await prisma.backupLog.findUnique({ where: { id: backupId } });
    if (!log || !log.content) {
      throw new Error('Backup content not available.');
    }

    const verification = await verifyBackupIntegrity(log.content, log.format);
    if (verification.valid) {
      await prisma.backupLog.update({
        where: { id: backupId },
        data: {
          status: 'VERIFIED',
          metadata: {
            ...(log.metadata as any),
            verificationReport: verification,
          } as any,
        },
      });
      revalidatePath('/admin/backups');
    }

    return { success: true, verification };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Deletes a BackupLog entry
 */
export async function deleteBackupRecord(backupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await checkAdminAuth();
    await prisma.backupLog.delete({ where: { id: backupId } });
    revalidatePath('/admin/backups');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Saves DR and automated backup schedules
 */
export async function saveBackupSettings(config: BackupScheduleConfig): Promise<{ success: boolean; error?: string }> {
  try {
    await checkAdminAuth();
    await prisma.siteSetting.upsert({
      where: { key: 'backup_config' },
      update: { value: JSON.stringify(config) },
      create: { key: 'backup_config', value: JSON.stringify(config) },
    });
    revalidatePath('/admin/backups');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Fetches recent backup logs for admin UI
 */
export async function getBackupLogs(): Promise<BackupLogData[]> {
  try {
    await checkAdminAuth();
    const logs = await prisma.backupLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        fileName: true,
        format: true,
        type: true,
        sizeBytes: true,
        recordCount: true,
        status: true,
        driveFileId: true,
        driveUrl: true,
        errorMessage: true,
        metadata: true,
        createdAt: true,
        completedAt: true,
      },
    });
    return logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
      completedAt: l.completedAt?.toISOString() || null,
      metadata: l.metadata as any,
    }));
  } catch (e) {
    return [];
  }
}
