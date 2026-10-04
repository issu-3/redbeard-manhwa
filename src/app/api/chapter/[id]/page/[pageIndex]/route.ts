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
    if (!chapter.downloadUrl) {
      let image = await prisma.chapterImage.findFirst({
        where: { chapterId: id, pageNumber: index + 1 },
        select: { imageUrl: true }
      });

      if (!image) {
        // Try 0-indexed match
        image = await prisma.chapterImage.findFirst({
          where: { chapterId: id, pageNumber: index },
          select: { imageUrl: true }
        });
        if (!image) {
          return new NextResponse('Page not found', { status: 404 });
        }
      }

      const imageUrl = image.imageUrl;
      let finalUrl = imageUrl;

      // Handle Google Drive lazy caching
      if (imageUrl.startsWith('gdrive:')) {
        const fileId = imageUrl.split(':')[1];
        const cacheKey = `cache/chapters/${chapter.id}/pages/${index}`;
        const { getCachedObjectUrl, uploadToR2 } = await import('@/lib/s3');
        
        // 1. Check R2 Cache
        try {
          console.log('DEBUG route: calling getCachedObjectUrl with R2_ENDPOINT:', process.env.R2_ENDPOINT);
          const cachedUrl = await getCachedObjectUrl(cacheKey);
          if (cachedUrl) {
            return NextResponse.redirect(cachedUrl, { status: 302, headers: { 'Cache-Control': 'public, max-age=3600' } });
          }
        } catch (e: any) {
          console.error('DEBUG route: getCachedObjectUrl failed:', e);
          // don't throw, just let it fall through to google drive
        }

        console.log('DEBUG route: about to load google-drive config');
        const { getGoogleDriveConfig, getAccessToken } = await import('@/lib/google-drive');
        const config = await getGoogleDriveConfig();
        let authHeader = '';
        if (config.enabled && config.credentials) {
          console.log('DEBUG route: getting access token');
          const token = await getAccessToken(config.credentials);
          authHeader = `Bearer ${token}`;
        }
        
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${authHeader ? '' : `&key=${process.env.GOOGLE_API_KEY}`}`;
        console.log('DEBUG route: fetching driveUrl:', driveUrl);
        const driveRes = await fetch(driveUrl, { headers: authHeader ? { Authorization: authHeader } : {} });
        console.log('DEBUG route: driveRes ok?', driveRes.ok);
        
        if (!driveRes.ok) {
          return new NextResponse('Failed to fetch from Google Drive', { status: 500 });
        }
        
        const buffer = Buffer.from(await driveRes.arrayBuffer());
        const mimeType = driveRes.headers.get('content-type') || 'image/jpeg';
        
        // 3. Upload to R2 Cache (fire and forget)
        try {
          uploadToR2(cacheKey, buffer, mimeType).catch(e => console.error('R2 cache fail:', e));
        } catch (e) {}

        // 4. Return image
        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', mimeType);
        responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new NextResponse(new Uint8Array(buffer), { status: 200, headers: responseHeaders });
      } else if (imageUrl.startsWith('gdrive-archive:')) {
        const parts = imageUrl.split(':');
        const fileId = parts[1];
        const fileName = parts.slice(2).join(':'); // In case file name has colons
        const cacheKey = `cache/chapters/${chapter.id}/pages/${index}`;
        const { getCachedObjectUrl, uploadToR2 } = await import('@/lib/s3');
        
        // 1. Check R2 Cache
        const cachedUrl = await getCachedObjectUrl(cacheKey);
        if (cachedUrl) {
          return NextResponse.redirect(cachedUrl, { status: 302, headers: { 'Cache-Control': 'public, max-age=3600' } });
        }

        // 2. Cache Miss -> Resolve Google Drive URL
        const { getGoogleDriveConfig, getAccessToken } = await import('@/lib/google-drive');
        const config = await getGoogleDriveConfig();
        let authHeader = '';
        if (config.enabled && config.credentials) {
          const token = await getAccessToken(config.credentials);
          authHeader = `Bearer ${token}`;
        }
        
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${authHeader ? '' : `&key=${process.env.GOOGLE_API_KEY}`}`;
        const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

        // 3. Get Metadata
        const metaCacheKey = `archive_${fileId}`;
        let metadata = metadataCache.get(metaCacheKey);
        
        if (!metadata) {
          let fileSize = await getRemoteFileSize(driveUrl, headers);
          metadata = await getRemoteCbzMetadata(driveUrl, headers, fileSize);
          if (metadataCache.size > 1000) metadataCache.clear();
          metadataCache.set(metaCacheKey, metadata);
        }

        const pageInfo = metadata.pages.find((p: any) => p.name === fileName);
        if (!pageInfo) {
          return new NextResponse('Page not found in archive', { status: 404 });
        }

        // 4. Extract specific page
        const imageBuffer = await getRemoteCbzPage(driveUrl, headers, pageInfo);

        let mimeType = 'image/jpeg';
        const nameLower = pageInfo.name.toLowerCase();
        if (nameLower.endsWith('.png')) mimeType = 'image/png';
        else if (nameLower.endsWith('.webp')) mimeType = 'image/webp';
        else if (nameLower.endsWith('.gif')) mimeType = 'image/gif';
        else if (nameLower.endsWith('.avif')) mimeType = 'image/avif';

        // 5. Upload to R2 Cache (fire and forget)
        try {
          uploadToR2(cacheKey, Buffer.from(imageBuffer), mimeType).catch(e => console.error('R2 cache fail:', e));
        } catch (e) {}

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', mimeType);
        responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new NextResponse(new Uint8Array(imageBuffer), { status: 200, headers: responseHeaders });
      }
      if (!imageUrl.includes('public.blob.vercel-storage.com') && 
          !imageUrl.includes('googleusercontent.com') && 
          !imageUrl.includes('drive.google.com') &&
          !imageUrl.startsWith('blob:') &&
          !imageUrl.startsWith('http')) {
        const { getPresignedR2Url } = await import('@/lib/s3');
        const presignedUrl = await getPresignedR2Url(imageUrl);
        if (presignedUrl) {
          finalUrl = presignedUrl;
        }
      } else if (imageUrl.startsWith('http') && imageUrl.includes('r2.cloudflarestorage.com')) {
        const { getPresignedR2Url } = await import('@/lib/s3');
        const presignedUrl = await getPresignedR2Url(imageUrl);
        if (presignedUrl) {
          finalUrl = presignedUrl;
        }
      }

      const isPresigned = finalUrl !== imageUrl;
      return NextResponse.redirect(finalUrl, {
        status: 302,
        headers: { 'Cache-Control': isPresigned ? 'public, max-age=3600' : 'public, max-age=31536000, immutable' }
      });
    }

    // 3. DOWNLOAD-type chapters: extract from remote CBZ with R2 CACHE
    if (!chapter.downloadUrl) {
      return new NextResponse('Chapter not found or no download URL', { status: 404 });
    }

    const cacheKey = `cache/chapters/${chapter.id}/pages/${index}`;
    const { getCachedObjectUrl, uploadToR2 } = await import('@/lib/s3');

    // Check R2 Cache first
    const cachedUrl = await getCachedObjectUrl(cacheKey);
    if (cachedUrl) {
      return NextResponse.redirect(cachedUrl, {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=3600' }
      });
    }

    // 4. Resolve URL (Cache Miss)
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
    const metaCacheKey = chapter.id;
    let metadata = metadataCache.get(metaCacheKey);
    const headers = resolved.serverHeaders || resolved.downloadHeaders || {};

    if (!metadata) {
      let fileSize = resolved.size;
      if (!fileSize) {
        fileSize = await getRemoteFileSize(resolved.downloadUrl, headers);
      }
      metadata = await getRemoteCbzMetadata(resolved.downloadUrl, headers, fileSize);
      if (metadataCache.size > 1000) metadataCache.clear();
      metadataCache.set(metaCacheKey, metadata);
    }

    const pageInfo = metadata.pages.find((p: any) => p.index === index);
    if (!pageInfo) {
      return new NextResponse('Page not found', { status: 404 });
    }

    // 6. Fetch the specific page from source
    const imageBuffer = await getRemoteCbzPage(resolved.downloadUrl, headers, pageInfo);

    // Determine mime type
    let mimeType = 'image/jpeg';
    const nameLower = pageInfo.name.toLowerCase();
    if (nameLower.endsWith('.png')) mimeType = 'image/png';
    else if (nameLower.endsWith('.webp')) mimeType = 'image/webp';
    else if (nameLower.endsWith('.gif')) mimeType = 'image/gif';
    else if (nameLower.endsWith('.avif')) mimeType = 'image/avif';

    // Fire-and-forget: Cache it in R2
    try {
      uploadToR2(cacheKey, Buffer.from(imageBuffer), mimeType).catch(e => {
        console.error('Failed to cache page in R2:', e);
      });
    } catch (e) {
      console.error('Failed to initiate R2 cache upload:', e);
    }

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', mimeType);
    responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');

    return new NextResponse(new Uint8Array(imageBuffer), { status: 200, headers: responseHeaders });

  } catch (error: any) {
    console.error(`CBZ page error:`, error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
