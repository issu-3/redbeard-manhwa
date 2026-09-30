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
          action: 'DOWNLOAD_CHAPTER',
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
        sourceType: true,
        downloadProvider: true
      }
    });

    if (!chapter) {
      return new NextResponse('Chapter not found', { status: 404 });
    }

    // 1a. UPLOAD-type chapters: images are stored individually (e.g. from Google Drive import).
    //     No external downloadUrl exists, so we handle it differently.
    if (!chapter.downloadUrl) {
      const images = await prisma.chapterImage.findMany({
        where: { chapterId: id },
        orderBy: { pageNumber: 'asc' },
        select: { imageUrl: true, pageNumber: true }
      });

      if (images.length === 0) {
        return new NextResponse('No download URL or images available for this chapter', { status: 400 });
      }

      const { searchParams } = new URL(request.url);

      // For proxy=true: construct a CBZ from individual images and stream it
      if (searchParams.get('proxy') === 'true') {
        try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();

          // Fetch each image and add to zip
          for (const img of images) {
            try {
              const imgRes = await fetch(img.imageUrl, { redirect: 'follow' });
              if (!imgRes.ok) continue;
              const buffer = await imgRes.arrayBuffer();
              const ext = img.imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
              zip.file(`page_${String(img.pageNumber).padStart(3, '0')}.${ext}`, buffer);
            } catch (e) {
              console.error(`Failed to fetch image ${img.pageNumber}:`, e);
            }
          }

          const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });

          const responseHeaders = new Headers();
          responseHeaders.set('Content-Type', 'application/zip');
          responseHeaders.set('Content-Length', String(zipBuffer.length));
          responseHeaders.set('Content-Disposition', `attachment; filename="chapter_${id}.cbz"`);

          return new NextResponse(zipBuffer as unknown as BodyInit, { status: 200, headers: responseHeaders });
        } catch (err: any) {
          console.error('CBZ construction error:', err);
          return new NextResponse('Failed to construct download', { status: 500 });
        }
      }

      // For resolve=true: tell the client to use the proxy endpoint
      if (searchParams.get('resolve') === 'true') {
        const proxyUrl = `/api/chapter/${id}/download?proxy=true`;
        return NextResponse.json({
          success: true,
          url: proxyUrl,
          fileName: `chapter_${id}.cbz`,
          mimeType: 'application/zip',
          size: null,
          downloadUrl: proxyUrl,
          expiresAt: null,
          provider: 'REDBEARD',
          downloadHeaders: null,
        });
      }

      // Default: inform that this chapter uses image-based storage
      return NextResponse.json({
        success: false,
        error: { code: 'NO_EXTERNAL_DOWNLOAD', message: 'This chapter uses image-based storage. Use ?resolve=true to download.', retryable: false }
      }, { status: 400 });
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

    // 3. Check for native resolve parameter
    const { searchParams } = new URL(request.url);

    // 3a. Server-side proxy streaming for providers that need secret headers (e.g. TeraBox)
    if (searchParams.get('proxy') === 'true') {
      try {
        const { resolverManager } = await import('@/lib/providers/factory');
        const resolver = resolverManager.getResolver(chapter.downloadUrl);
        if (!resolver) {
          return new NextResponse('No resolver for this chapter', { status: 400 });
        }

        const resolved = await resolver.resolve(chapter.downloadUrl);
        if (!resolved.success || !resolved.downloadUrl) {
          return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
        }

        // Fetch the file server-side with full headers (including secrets)
        const upstream = await fetch(resolved.downloadUrl, {
          headers: resolved.serverHeaders || resolved.downloadHeaders || {},
          redirect: 'follow',
        });

        if (!upstream.ok || !upstream.body) {
          console.error(`Proxy upstream fetch failed: HTTP ${upstream.status} ${upstream.statusText}`);
          const text = await upstream.text().catch(() => 'No text');
          console.error(`Proxy upstream response body: ${text.substring(0, 500)}`);
          return new NextResponse(`Upstream fetch failed (HTTP ${upstream.status})`, { status: 502 });
        }

        // Stream through to the client
        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', resolved.mimeType || 'application/pdf');
        if (resolved.size) {
          responseHeaders.set('Content-Length', String(resolved.size));
        }
        const upstreamCL = upstream.headers.get('content-length');
        if (upstreamCL && !resolved.size) {
          responseHeaders.set('Content-Length', upstreamCL);
        }
        responseHeaders.set('Content-Disposition', `attachment; filename="${resolved.fileName}"`);

        return new NextResponse(upstream.body, { status: 200, headers: responseHeaders });
      } catch (err: any) {
        console.error('Proxy download error:', err);
        return new NextResponse('Proxy download failed', { status: 500 });
      }
    }

    if (searchParams.get('resolve') === 'true') {
      try {
        const { resolverManager } = await import('@/lib/providers/factory');
        const resolver = resolverManager.getResolver(chapter.downloadUrl);

        if (resolver) {
          const resolved = await resolver.resolve(chapter.downloadUrl);
          
          if (!resolved.success) {
             return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
          }

          // FILE TYPE GATE — Allow PDF and CBZ/ZIP downloads
          const isDownloadable =
            resolved.mimeType === 'application/pdf' ||
            resolved.mimeType === 'application/zip' ||
            resolved.mimeType === 'application/x-cbz' ||
            resolved.mimeType === 'application/vnd.comicbook+zip' ||
            resolved.mimeType === 'application/octet-stream' ||
            resolved.fileName.toLowerCase().endsWith('.pdf') ||
            resolved.fileName.toLowerCase().endsWith('.cbz') ||
            resolved.fileName.toLowerCase().endsWith('.zip');

          if (!isDownloadable) {
            return NextResponse.json({
              success: false,
              error: {
                code: 'INVALID_FILE_TYPE',
                message: `Unsupported file type: ${resolved.mimeType} (${resolved.fileName})`,
                retryable: false,
              }
            }, { status: 400 });
          }

          // Strip sensitive headers (cookies, auth tokens) before sending to client.
          const safeHeaders: Record<string, string> = {};
          if (resolved.downloadHeaders) {
            for (const [key, value] of Object.entries(resolved.downloadHeaders)) {
              const lk = key.toLowerCase();
              if (lk !== 'cookie' && lk !== 'authorization' && lk !== 'set-cookie') {
                safeHeaders[key] = value;
              }
            }
          }

          // If the provider requires server-side proxy (e.g. TeraBox needs cookies),
          // return a proxy URL instead of the raw download URL.
          if (resolved.requiresProxy) {
            const proxyUrl = `/api/chapter/${id}/download?proxy=true`;
            return NextResponse.json({
              success: true,
              url: proxyUrl,
              fileName: resolved.fileName,
              mimeType: resolved.mimeType,
              size: resolved.size,
              downloadUrl: proxyUrl,
              expiresAt: resolved.expiresAt,
              provider: resolved.provider || chapter.downloadProvider,
              downloadHeaders: Object.keys(safeHeaders).length > 0 ? safeHeaders : null,
            });
          }

          return NextResponse.json({
            success: true,
            url: resolved.downloadUrl, // For backward compatibility
            fileName: resolved.fileName,
            mimeType: resolved.mimeType,
            size: resolved.size,
            downloadUrl: resolved.downloadUrl,
            expiresAt: resolved.expiresAt,
            provider: resolved.provider || chapter.downloadProvider,
            downloadHeaders: Object.keys(safeHeaders).length > 0 ? safeHeaders : null,
          });
        }
      } catch (err: any) {
        return NextResponse.json({ success: false, error: { message: err.message } }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        url: chapter.downloadUrl,
        downloadUrl: chapter.downloadUrl,
        provider: chapter.downloadProvider || chapter.sourceType
      });
    }

    // 4. Redirect to the actual download URL
    return NextResponse.redirect(chapter.downloadUrl);
  } catch (error) {
    console.error('Download route error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
