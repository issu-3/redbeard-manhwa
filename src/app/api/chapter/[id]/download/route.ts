import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const DEDUPE_WINDOW_MS = 60_000; // 60 seconds

declare global {
  var _downloadDedupeMap: Map<string, number> | undefined;
}

const dedupeMap = globalThis._downloadDedupeMap ?? new Map<string, number>();
if (!globalThis._downloadDedupeMap) globalThis._downloadDedupeMap = dedupeMap;

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

    // Use our existing view tracking endpoint logic (via internal POST or directly here)
    // Since we're server-side, it's easier to just call the same endpoint internally via fetch,
    // but Next.js absolute URL is tricky. We'll duplicate the increment/history logic minimally.
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
        // Record download analytics (using ViewLog as the existing mechanism)
        // We do not record ReadingHistory or lastReadAt for downloads
        
        // Increment views
        await Promise.all([
          prisma.chapter.update({ where: { id: chapter.id }, data: { totalViews: { increment: 1 } } }),
          prisma.series.update({ where: { id: chapter.seriesId }, data: { totalViews: { increment: 1 } } }),
          prisma.viewLog.create({
            data: {
              seriesId: chapter.seriesId,
              chapterId: chapter.id,
              userId: userId || null,
              ipAddress: ipAddress
            }
          }).catch(() => {}) // Catch unique constraint errors if any
        ]);
      }
    } catch (e) {
      console.error('Failed to update download analytics:', e);
      // We don't fail the request if tracking fails
    }

    // 3. Redirect to the actual download URL
    return NextResponse.redirect(chapter.downloadUrl);
  } catch (error) {
    console.error('Download route error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
