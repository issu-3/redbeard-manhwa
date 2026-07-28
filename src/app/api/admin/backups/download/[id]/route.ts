import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const log = await prisma.backupLog.findUnique({ where: { id } });

    if (!log || !log.content) {
      return NextResponse.json({ error: 'Backup file content not found in database.' }, { status: 404 });
    }

    const contentType = log.format === 'JSON' ? 'application/json' : 'application/sql';
    const filename = log.fileName || `redbeard-backup-${log.id}.${log.format.toLowerCase()}`;

    return new NextResponse(log.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(Buffer.byteLength(log.content, 'utf8')),
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    console.error('[BackupDownload] Error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
