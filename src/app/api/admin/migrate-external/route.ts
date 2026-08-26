import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const totalExternal = await prisma.chapter.count({
      where: { sourceType: 'EXTERNAL' }
    });

    const result = await prisma.chapter.updateMany({
      where: {
        sourceType: 'EXTERNAL',
        AND: [
          { downloadUrl: { not: null } },
          { downloadUrl: { not: '' } }
        ]
      },
      data: {
        sourceType: 'DOWNLOAD'
      }
    });

    return NextResponse.json({
      success: true,
      totalExternalRecordsFound: totalExternal,
      migratedCount: result.count,
      skippedCount: totalExternal - result.count,
      message: `Migrated ${result.count} valid EXTERNAL chapters. Skipped ${totalExternal - result.count} missing/invalid URL records.`
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
