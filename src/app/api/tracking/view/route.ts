import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

type ViewLogItem = {
  seriesId: string;
  chapterId: string;
  userId: string | null;
  ipAddress: string | null;
};

const DEDUPE_WINDOW_MS = 60_000; // 60 seconds
const FLUSH_INTERVAL_MS = 5_000; // 5 seconds
const MAX_BUFFER_SIZE = 20;

declare global {
  var _viewDedupeMap: Map<string, number> | undefined;
  var _viewLogBuffer: ViewLogItem[] | undefined;
  var _viewFlushTimer: NodeJS.Timeout | undefined;
}

const dedupeMap = globalThis._viewDedupeMap ?? new Map<string, number>();
if (!globalThis._viewDedupeMap) globalThis._viewDedupeMap = dedupeMap;

const buffer = globalThis._viewLogBuffer ?? [];
if (!globalThis._viewLogBuffer) globalThis._viewLogBuffer = buffer;

async function flushViewBuffer() {
  if (buffer.length === 0) return;
  const itemsToFlush = [...buffer];
  buffer.length = 0; // Clear buffer immediately

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
      promises.push(prisma.viewLog.createMany({
        data: itemsToFlush.map(i => ({
          seriesId: i.seriesId,
          chapterId: i.chapterId,
          userId: i.userId,
          ipAddress: i.ipAddress
        })),
        skipDuplicates: true
      }));
    }

    await Promise.allSettled(promises);
  } catch (err) {
    console.error('Error flushing view buffer:', err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chapterId, seriesId } = body;

    if (!chapterId || !seriesId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const session = await auth();
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || null;
    const dedupeKey = `${session?.user?.id || ipAddress || 'anon'}:${chapterId}`;
    const now = Date.now();
    const lastSeen = dedupeMap.get(dedupeKey);

    if (dedupeMap.size > 5000) {
      for (const [key, timestamp] of dedupeMap.entries()) {
        if (now - timestamp > DEDUPE_WINDOW_MS) dedupeMap.delete(key);
      }
    }

    const isDuplicate = lastSeen && (now - lastSeen < DEDUPE_WINDOW_MS);
    dedupeMap.set(dedupeKey, now);

    if (!isDuplicate) {
      // 1. Record reading history on non-duplicate hits
      if (session?.user?.id) {
        try {
          await Promise.all([
            prisma.readingHistory.upsert({
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
            }),
            prisma.user.update({
              where: { id: session.user.id },
              data: { lastReadAt: new Date() },
            })
          ]);
        } catch (e) {
          console.error('Failed to update reading history:', e);
        }
      }

      // 2. Buffer view counts and logs
      buffer.push({
        seriesId,
        chapterId,
        userId: session?.user?.id || null,
        ipAddress
      });

      if (buffer.length >= MAX_BUFFER_SIZE) {
        flushViewBuffer().catch(e => console.error('Flush error:', e));
      } else if (!globalThis._viewFlushTimer) {
        globalThis._viewFlushTimer = setTimeout(() => {
          globalThis._viewFlushTimer = undefined;
          flushViewBuffer().catch(e => console.error('Flush timer error:', e));
        }, FLUSH_INTERVAL_MS);
      }
    }

    return NextResponse.json({ success: true, deduplicated: Boolean(isDuplicate) });
  } catch (error) {
    console.error('View tracking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
