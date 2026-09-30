import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRemoteFileSize, getRemoteCbzMetadata } from '@/lib/cbz-remote';

// Cache in memory for quick subsequent page reads
declare global {
  var _cbzMetadataCache: Map<string, any> | undefined;
}
const metadataCache = globalThis._cbzMetadataCache ?? new Map<string, any>();
if (!globalThis._cbzMetadataCache) globalThis._cbzMetadataCache = metadataCache;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Fetch the chapter with images (for UPLOAD-type chapters)
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      select: {
        id: true,
        downloadUrl: true,
        sourceType: true,
        images: {
          orderBy: { pageNumber: 'asc' },
          select: { pageNumber: true, imageUrl: true, width: true, height: true }
        }
      }
    });

    if (!chapter) {
      return new NextResponse('Chapter not found', { status: 404 });
    }

    // 2. UPLOAD-type chapters: images are stored as individual ChapterImage records
    //    (e.g. from Google Drive import). Return them directly.
    if (!chapter.downloadUrl && chapter.images.length > 0) {
      const metadata = {
        fileType: 'IMAGES' as const,
        pageCount: chapter.images.length,
        pages: chapter.images.map((img, i) => ({
          index: i,
          name: `page_${img.pageNumber}.jpg`,
          imageUrl: img.imageUrl,
          width: img.width || 800,
          height: img.height || 1200,
        })),
      };

      return NextResponse.json({
        success: true,
        ...metadata
      });
    }

    // 3. DOWNLOAD-type chapters: need a downloadUrl to fetch CBZ remotely
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

    // 5. Check cache
    const cacheKey = chapter.id;
    if (metadataCache.has(cacheKey)) {
      return NextResponse.json({ success: true, ...metadataCache.get(cacheKey) });
    }

    // 6. Fetch CBZ metadata
    const headers = resolved.serverHeaders || resolved.downloadHeaders || {};
    
    let fileSize = resolved.size;
    if (!fileSize) {
      fileSize = await getRemoteFileSize(resolved.downloadUrl, headers);
    }

    const metadata = await getRemoteCbzMetadata(resolved.downloadUrl, headers, fileSize);
    
    // Store in cache (keep it for 1 hour to prevent memory leaks, or just bound the map size)
    if (metadataCache.size > 1000) metadataCache.clear();
    metadataCache.set(cacheKey, metadata);

    return NextResponse.json({
      success: true,
      ...metadata
    });
  } catch (error: any) {
    console.error('CBZ online-info error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
