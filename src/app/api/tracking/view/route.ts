import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chapterId, seriesId } = body;

    if (!chapterId || !seriesId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const session = await auth();

    // 1. Record reading history
    if (session?.user?.id) {
      try {
        await prisma.readingHistory.upsert({
          where: {
            userId_chapterId: {
              userId: session.user.id,
              chapterId: chapterId,
            },
          },
          create: {
            userId: session.user.id,
            chapterId: chapterId,
            seriesId: seriesId,
            pageNumber: 1,
          },
          update: {
            updatedAt: new Date(),
          },
        });

        // Update lastReadAt on user
        await prisma.user.update({
          where: { id: session.user.id },
          data: { lastReadAt: new Date() },
        });
      } catch (e) {
        console.error('Failed to update reading history:', e);
      }
    }

    // 2. Increment view counts
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;
      
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { totalViews: { increment: 1 } },
      });
      await prisma.series.update({
        where: { id: seriesId },
        data: { totalViews: { increment: 1 } },
      });
      
      await prisma.viewLog.create({
        data: {
          seriesId: seriesId,
          chapterId: chapterId,
          userId: session?.user?.id || null,
          ipAddress: ipAddress ? ipAddress.split(',')[0].trim() : null,
        }
      });
    } catch (e) {
      console.error('Failed to increment view count:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
