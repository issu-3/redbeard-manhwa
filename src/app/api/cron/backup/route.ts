import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDatabaseDump } from '@/lib/backup-engine';
import { uploadBackupToDrive } from '@/lib/google-drive';
import type { BackupScheduleConfig } from '@/types/backup';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Authorization check (Vercel Cron Secret or Dev mode)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isDev = process.env.NODE_ENV === 'development';
    const isValidCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isDev && !isValidCron && !request.nextUrl.searchParams.has('force')) {
      return NextResponse.json({ error: 'Unauthorized cron execution' }, { status: 401 });
    }

    const schedule = (request.nextUrl.searchParams.get('schedule') || 'daily').toLowerCase() as 'daily' | 'weekly' | 'monthly';
    const typeMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY' } as const;
    const backupType = typeMap[schedule] || 'DAILY';

    // 2. Load schedule config
    let config: BackupScheduleConfig = {
      dailyEnabled: true,
      weeklyEnabled: true,
      monthlyEnabled: true,
      driveEnabled: Boolean(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT),
      notifyOnFailure: true,
    };

    try {
      const setting = await prisma.siteSetting.findUnique({ where: { key: 'backup_config' } });
      if (setting?.value) {
        config = { ...config, ...JSON.parse(setting.value) };
      }
    } catch (e) {}

    // Check if enabled
    if (schedule === 'daily' && !config.dailyEnabled) {
      return NextResponse.json({ skipped: true, reason: 'Daily backup schedule disabled in settings' });
    }
    if (schedule === 'weekly' && !config.weeklyEnabled) {
      return NextResponse.json({ skipped: true, reason: 'Weekly backup schedule disabled in settings' });
    }
    if (schedule === 'monthly' && !config.monthlyEnabled) {
      return NextResponse.json({ skipped: true, reason: 'Monthly backup schedule disabled in settings' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `redbeard-${schedule}-backup-${timestamp}.sql`;

    // 3. Create initial log
    const log = await prisma.backupLog.create({
      data: {
        fileName,
        format: 'SQL',
        type: backupType,
        sizeBytes: 0,
        recordCount: 0,
        status: 'IN_PROGRESS',
      },
    });

    try {
      // 4. Generate SQL dump
      const dump = await generateDatabaseDump('SQL');

      // 5. Offsite Google Drive upload
      const subfolder = schedule === 'weekly' ? 'Weekly' : schedule === 'monthly' ? 'Monthly' : 'Daily';
      const driveRes = await uploadBackupToDrive(fileName, dump.content, subfolder);

      // 6. Update log SUCCESS
      await prisma.backupLog.update({
        where: { id: log.id },
        data: {
          sizeBytes: dump.sizeBytes,
          recordCount: dump.recordCount,
          status: 'SUCCESS',
          content: dump.content,
          driveFileId: driveRes.fileId || null,
          driveUrl: driveRes.webViewLink || null,
          metadata: { tableCounts: dump.tableCounts } as any,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, backupId: log.id, schedule, recordCount: dump.recordCount });
    } catch (innerError: any) {
      console.error(`[CronBackup] Execution failed:`, innerError.message);

      // Update log FAILED
      await prisma.backupLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          errorMessage: innerError.message,
          completedAt: new Date(),
        },
      });

      // Requirement 7: Admin notifications on failure
      if (config.notifyOnFailure) {
        try {
          const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
          if (admins.length > 0) {
            await prisma.notification.createMany({
              data: admins.map((admin) => ({
                userId: admin.id,
                type: 'WARNING' as const,
                title: 'DR Alert: Automated Backup Failed',
                message: `The automated ${schedule} database snapshot failed: ${innerError.message}`,
                link: '/admin/backups',
              })),
            });
          }
        } catch (notifErr) {
          console.error('[CronBackup] Failed to send admin notifications:', notifErr);
        }
      }

      return NextResponse.json({ success: false, error: innerError.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
