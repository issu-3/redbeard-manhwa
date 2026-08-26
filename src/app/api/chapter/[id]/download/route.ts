import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const DEDUPE_WINDOW_MS = 60_000; // 60 seconds
const FLUSH_INTERVAL_MS = 5_000; // 5 seconds
const MAX_BUFFER_SIZE = 20;

type DownloadLogItem = {
  seriesId: string;
  chapterId: string;
  userId: string | null;
  ipAddress: string | null;
  sourceType: string | null;
};

declare global {
  var _downloadDedupeMap: Map<string, number> | undefined;
  var _downloadLogBuffer: DownloadLogItem[] | undefined;
  var _downloadFlushTimer: NodeJS.Timeout | undefined;
}

const dedupeMap = globalThis._downloadDedupeMap ?? new Map<string, number>();
if (!globalThis._downloadDedupeMap) globalThis._downloadDedupeMap = dedupeMap;

const buffer = globalThis._downloadLogBuffer ?? [];
if (!globalThis._downloadLogBuffer) globalThis._downloadLogBuffer = buffer;

async function flushDownloadBuffer() {
  if (buffer.length === 0) return;
  const itemsToFlush = [...buffer];
  buffer.length = 0;

  try {
    const chapterIncrements = new Map<string, number>();
    const seriesIncrements = new Map<string, number>();

    for (const item of itemsToFlush) {
      chapterIncrements.set(item.chapterId, (chapterIncrements.get(item.chapterId) || 0) + 1);
      seriesIncrements.set(item.seriesId, (seriesIncrements.get(item.seriesId) || 0) + 1);
    }

    const promises: Promise<any>[] = [];

    for (const [chId, count] of chapterIncrements.entries()) {
      promises.push(prisma.chapter.update({ where: { id: chId }, data: { totalViews: { increment: count } } }));
    }
    for (const [sId, count] of seriesIncrements.entries()) {
      promises.push(prisma.series.update({ where: { id: sId }, data: { totalViews: { increment: count } } }));
    }

    if (itemsToFlush.length > 0) {
      promises.push(prisma.auditLog.createMany({
        data: itemsToFlush.map(i => ({
          userId: i.userId,
          action: i.sourceType === 'EXTERNAL' ? 'EXTERNAL_CLICK' : 'DOWNLOAD_CHAPTER',
          targetType: 'CHAPTER',
          targetId: i.chapterId,
          ipAddress: i.ipAddress,
          metadata: { seriesId: i.seriesId }
        })),
        skipDuplicates: true
      }));
    }

    await Promise.allSettled(promises);
  } catch (err) {
    console.error('Error flushing download buffer:', err);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Fetch the chapter
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      select: { 
        id: true, 
        seriesId: true, 
        downloadUrl: true, 
        sourceType: true 
      }
    });

    if (!chapter) {
      return new NextResponse('Chapter not found', { status: 404 });
    }

    if (!chapter.downloadUrl) {
      return new NextResponse('No download URL available for this chapter', { status: 400 });
    }

    // 2. Track view asynchronously
    const session = await auth();
    const userId = session?.user?.id;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || null;

    try {
      const dedupeKey = `${userId || ipAddress || 'anon'}:${chapter.id}`;
      const now = Date.now();
      const lastSeen = dedupeMap.get(dedupeKey);

      // Clean up map to prevent memory leak
      if (dedupeMap.size > 5000) {
        for (const [key, timestamp] of dedupeMap.entries()) {
          if (now - timestamp > DEDUPE_WINDOW_MS) dedupeMap.delete(key);
        }
      }

      const isDuplicate = lastSeen && (now - lastSeen < DEDUPE_WINDOW_MS);
      dedupeMap.set(dedupeKey, now);

      if (!isDuplicate) {
        buffer.push({
          seriesId: chapter.seriesId,
          chapterId: chapter.id,
          userId: userId || null,
          ipAddress,
          sourceType: chapter.sourceType
        });

        if (buffer.length >= MAX_BUFFER_SIZE) {
          flushDownloadBuffer().catch(e => console.error('Flush error:', e));
        } else if (!globalThis._downloadFlushTimer) {
          globalThis._downloadFlushTimer = setTimeout(() => {
            globalThis._downloadFlushTimer = undefined;
            flushDownloadBuffer().catch(e => console.error('Flush timer error:', e));
          }, FLUSH_INTERVAL_MS);
        }
      }
    } catch (e) {
      console.error('Failed to update download analytics:', e);
    }

    // 3. Redirect to the actual download URL
    return NextResponse.redirect(chapter.downloadUrl);
  } catch (error) {
    console.error('Download route error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
