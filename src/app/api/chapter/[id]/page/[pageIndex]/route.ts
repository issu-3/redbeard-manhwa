import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRemoteFileSize, getRemoteCbzMetadata, getRemoteCbzPage } from '@/lib/cbz-remote';

// Share the same cache
const metadataCache = globalThis._cbzMetadataCache ?? new Map<string, any>();
if (!globalThis._cbzMetadataCache) globalThis._cbzMetadataCache = metadataCache;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string, pageIndex: string }> }
) {
  try {
    const { id, pageIndex } = await params;
    const index = parseInt(pageIndex, 10);
    if (isNaN(index)) {
      return new NextResponse('Invalid page index', { status: 400 });
    }
    
    // 1. Fetch the chapter
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      select: { id: true, downloadUrl: true, sourceType: true }
    });

    if (!chapter) {
      return new NextResponse('Chapter not found', { status: 404 });
    }

    // 2. UPLOAD-type chapters: images are stored as individual ChapterImage records.
    //    Look up by pageNumber (0-indexed from client, but stored as 1-indexed in DB).
    if (!chapter.downloadUrl) {
      const image = await prisma.chapterImage.findFirst({
        where: { chapterId: id, pageNumber: index + 1 },
        select: { imageUrl: true }
      });

      if (!image) {
        // Also try 0-indexed match in case the client sends pageNumber directly
        const imageAlt = await prisma.chapterImage.findFirst({
          where: { chapterId: id, pageNumber: index },
          select: { imageUrl: true }
        });
        if (!imageAlt) {
          return new NextResponse('Page not found', { status: 404 });
        }
        // Redirect to the Vercel Blob URL with long-term caching
        return NextResponse.redirect(imageAlt.imageUrl, {
          status: 302,
          headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }
        });
      }

      return NextResponse.redirect(image.imageUrl, {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }
      });
    }

    // 3. DOWNLOAD-type chapters: extract from remote CBZ
    if (!chapter.downloadUrl) {
      return new NextResponse('Chapter not found or no download URL', { status: 404 });
    }

    // 4. Resolve URL
    const { resolverManager } = await import('@/lib/providers/factory');
    const resolver = resolverManager.getResolver(chapter.downloadUrl);
    if (!resolver) {
      return new NextResponse('No resolver for this chapter', { status: 400 });
    }

    const resolved = await resolver.resolve(chapter.downloadUrl);
    if (!resolved.success || !resolved.downloadUrl) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: 400 });
    }

    // 5. Get Metadata (from cache or fetch)
    const cacheKey = chapter.id;
    let metadata = metadataCache.get(cacheKey);
    const headers = resolved.serverHeaders || resolved.downloadHeaders || {};

    if (!metadata) {
      let fileSize = resolved.size;
      if (!fileSize) {
        fileSize = await getRemoteFileSize(resolved.downloadUrl, headers);
      }
      metadata = await getRemoteCbzMetadata(resolved.downloadUrl, headers, fileSize);
      if (metadataCache.size > 1000) metadataCache.clear();
      metadataCache.set(cacheKey, metadata);
    }

    const pageInfo = metadata.pages.find((p: any) => p.index === index);
    if (!pageInfo) {
      return new NextResponse('Page not found', { status: 404 });
    }

    // 6. Fetch the specific page
    const imageBuffer = await getRemoteCbzPage(resolved.downloadUrl, headers, pageInfo);

    // Determine mime type
    let mimeType = 'image/jpeg';
    const nameLower = pageInfo.name.toLowerCase();
    if (nameLower.endsWith('.png')) mimeType = 'image/png';
    else if (nameLower.endsWith('.webp')) mimeType = 'image/webp';
    else if (nameLower.endsWith('.gif')) mimeType = 'image/gif';
    else if (nameLower.endsWith('.avif')) mimeType = 'image/avif';

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', mimeType);
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(new Uint8Array(imageBuffer), { status: 200, headers: responseHeaders });

  } catch (error: any) {
    console.error(`CBZ page error:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
