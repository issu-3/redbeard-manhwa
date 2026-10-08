export interface Env {
  ORIGIN_URL: string;
  WORKER_SECRET: string;
  R2_BUCKET: R2Bucket;
  DATABASE_URL?: string;
  GOOGLE_DRIVE_SERVICE_ACCOUNT?: string;
}

function readUInt16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

import { resolveChapterImage } from './db';
import { getGoogleDriveToken } from './gdrive';
import { getRemoteFileSize, getRemoteCbzMetadata } from './cbz';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle Next.js image proxying (covers, thumbnails) to bypass Vercel Image Optimization
    if (url.pathname === '/_next/image') {
      const targetUrlStr = url.searchParams.get('url');
      if (!targetUrlStr) return fetch(request);

      let targetUrl: URL;
      try {
        // Provide a dummy base to safely parse relative URLs
        targetUrl = new URL(targetUrlStr, 'http://localhost');
      } catch (e) {
        return fetch(request);
      }

      // If it's a relative URL or matches the origin, fallback to origin Next.js handling
      if (targetUrlStr.startsWith('/') || targetUrl.hostname === 'localhost' || targetUrlStr.startsWith(env.ORIGIN_URL)) {
        return fetch(request);
      }

      // SSRF Protection: Strict Allowlist based on Redbeard architecture
      const allowedExactHosts = [
        'drive.google.com',
        'cdn.discordapp.com',
        'public.blob.vercel-storage.com'
      ];
      
      const isAllowed = 
        allowedExactHosts.includes(targetUrl.hostname) ||
        targetUrl.hostname.endsWith('.public.blob.vercel-storage.com') ||
        targetUrl.hostname.endsWith('.googleusercontent.com') ||
        targetUrl.hostname.endsWith('.r2.cloudflarestorage.com');

      if (!isAllowed || targetUrl.protocol !== 'https:') {
        // Fallback gracefully for unknown external hosts to preserve existing Next.js logic
        return fetch(request);
      }

      // Sanitize Cache Key: Cloudflare Cache API requires the cache key to match the worker's zone.
      // We strip 'w' and 'q' Next.js parameters to prevent cache exhaustion and maximize cache hits.
      const cleanCacheUrl = new URL(url.pathname, url.origin);
      cleanCacheUrl.searchParams.set('url', targetUrl.toString());
      
      const cache = caches.default;
      const cacheKey = new Request(cleanCacheUrl.toString(), { method: 'GET' });
      
      let response = await cache.match(cacheKey);
      if (response) {
        return response;
      }

      try {
        const fetchRes = await fetch(targetUrl.toString(), {
          method: 'GET',
          headers: { 'User-Agent': 'Cloudflare-Worker-Image-Proxy' },
        });

        if (!fetchRes.ok) {
          // If the direct fetch fails (e.g. 403 from Vercel Blob or 400 from Google), fallback to origin
          // because Next.js Image Optimization might still succeed
          return fetch(request);
        }

        const mimeType = fetchRes.headers.get('content-type') || 'application/octet-stream';
        // Prevent proxying of HTML/scripts even if hosted on an allowed domain
        if (!mimeType.startsWith('image/')) {
           return fetch(request);
        }

        response = new Response(fetchRes.body, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'CDN-Cache-Control': 'max-age=31536000',
            'Access-Control-Allow-Origin': '*',
          }
        });

        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
      } catch (e: any) {
        console.error('Proxy Error:', e);
        return fetch(request);
      }
    }

    // Only handle chapter image requests
    if (!url.pathname.startsWith('/api/chapter/') || !url.pathname.includes('/page/')) {
      return fetch(request);
    }

    // 1. Check Cache
    const cache = caches.default;
    const cleanCacheUrl = new URL(url.pathname, url.origin);
    const cacheKey = new Request(cleanCacheUrl.toString(), {
      method: 'GET',
    });
    
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }

    try {
      // 1.5 Phase 1: Try resolving JPG/PNG natively on the edge
      const match = url.pathname.match(/\/api\/chapter\/([^\/]+)\/page\/(\d+)/);
      if (match && env.DATABASE_URL) {
        const chapterId = match[1];
        const pageIndex = parseInt(match[2], 10);
        
        try {
          const resolution = await resolveChapterImage(chapterId, pageIndex, env.DATABASE_URL);
          
          if (resolution.type === 'not_found') {
            return new Response('Page not found', { status: 404 });
          }

          if (resolution.type === 'image' && resolution.imageUrl) {
            let fetchUrl = resolution.imageUrl;
            const headers: Record<string, string> = {};
            let isCbzArchive = false;
            let cbzFileName = '';

            if (fetchUrl.startsWith('gdrive:') || fetchUrl.startsWith('gdrive-archive:')) {
              const parts = fetchUrl.split(':');
              const fileId = parts[1];
              if (fetchUrl.startsWith('gdrive-archive:')) {
                isCbzArchive = true;
                cbzFileName = parts.slice(2).join(':');
              }
              
              let authHeader = '';
              if (env.GOOGLE_DRIVE_SERVICE_ACCOUNT) {
                const token = await getGoogleDriveToken(env.GOOGLE_DRIVE_SERVICE_ACCOUNT);
                authHeader = `Bearer ${token}`;
              }
              // In production we usually omit the API key if authHeader is present, but keep fallback
              fetchUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
              if (authHeader) {
                headers['Authorization'] = authHeader;
              }
            }

            if (isCbzArchive) {
              const fileSize = await getRemoteFileSize(fetchUrl, headers);
              const metadata = await getRemoteCbzMetadata(fetchUrl, headers, fileSize);
              const pageInfo = metadata.pages.find(p => p.name === cbzFileName);
              if (!pageInfo) {
                return new Response('File not found in archive', { status: 404 });
              }

              const padding = 1024;
              const fetchStart = pageInfo.localHeaderOffset;
              const fetchEnd = pageInfo.localHeaderOffset + 30 + pageInfo.name.length + padding + pageInfo.compressedSize;

              const sliceRes = await fetch(fetchUrl, {
                method: 'GET',
                headers: {
                  ...headers,
                  'Range': `bytes=${fetchStart}-${fetchEnd}`
                }
              });

              if (!sliceRes.ok && sliceRes.status !== 206) {
                return new Response('Failed to fetch CBZ slice', { status: sliceRes.status });
              }

              const buf = new Uint8Array(await sliceRes.arrayBuffer());
              if (buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
                return new Response('Invalid local file header signature', { status: 500 });
              }

              const fileNameLength = readUInt16LE(buf, 26);
              const extraFieldLength = readUInt16LE(buf, 28);
              const dataStart = 30 + fileNameLength + extraFieldLength;

              if (dataStart + pageInfo.compressedSize > buf.length) {
                return new Response('Local file header extra field too large', { status: 500 });
              }

              const compressedData = buf.subarray(dataStart, dataStart + pageInfo.compressedSize);
              let body: any;
              if (pageInfo.compressionMethod === 0) {
                body = compressedData;
              } else if (pageInfo.compressionMethod === 8) {
                const readable = new Response(compressedData).body;
                if (!readable) throw new Error('No readable stream');
                body = readable.pipeThrough(new DecompressionStream('deflate-raw'));
              } else {
                return new Response('Unsupported compression method', { status: 500 });
              }

              let mimeType = 'image/jpeg';
              const nameLower = pageInfo.name.toLowerCase();
              if (nameLower.endsWith('.png')) mimeType = 'image/png';
              else if (nameLower.endsWith('.webp')) mimeType = 'image/webp';
              else if (nameLower.endsWith('.gif')) mimeType = 'image/gif';
              else if (nameLower.endsWith('.avif')) mimeType = 'image/avif';

              response = new Response(body, {
                status: 200,
                headers: {
                  'Content-Type': mimeType,
                  'Cache-Control': 'public, max-age=31536000, immutable',
                  'CDN-Cache-Control': 'max-age=31536000',
                }
              });
              ctx.waitUntil(cache.put(cacheKey, response.clone()));
              return response;
            }

            const fetchRes = await fetch(fetchUrl, {
              method: 'GET',
              headers,
            });

            if (!fetchRes.ok) {
              return new Response(`Failed to fetch upstream image: ${fetchRes.status}`, { status: fetchRes.status });
            }

            const mimeType = fetchRes.headers.get('content-type') || 'image/jpeg';
            
            response = new Response(fetchRes.body, {
              status: 200,
              headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'CDN-Cache-Control': 'max-age=31536000',
              }
            });

            ctx.waitUntil(cache.put(cacheKey, response.clone()));
            return response;
          }
        } catch (dbErr: any) {
          console.error('Edge native resolution failed (DB or GDrive):', dbErr);
          // Fall through to Vercel resolving if DB fails
        }
      }

      // 2. Fallback to Vercel Origin (Phase 2 CBZ/TeraBox chapters will hit this)
      const resolveUrl = new URL(url.pathname, env.ORIGIN_URL);
      resolveUrl.searchParams.set('resolve', 'true');

      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (env.WORKER_SECRET) {
        headers['Authorization'] = `Bearer ${env.WORKER_SECRET}`;
      }

      const resolveRes = await fetch(resolveUrl.toString(), {
        method: 'GET',
        headers,
      });

      if (!resolveRes.ok) {
        return new Response('Failed to resolve image', { status: resolveRes.status });
      }

      const contentType = resolveRes.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error(`Unexpected Content-Type from resolve endpoint: ${contentType}`);
        return new Response(`Expected JSON metadata but got ${contentType}`, { status: 502 });
      }

      const config = await resolveRes.json() as any;

      // 3. Process based on configuration
      if (config.type === 'redirect') {
        const r2Res = await fetch(config.url, {
          method: 'GET',
        });

        if (!r2Res.ok) {
          return new Response('Failed to fetch image from storage', { status: r2Res.status });
        }

        const mimeType = r2Res.headers.get('content-type') || 'image/jpeg';
        response = new Response(r2Res.body, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'CDN-Cache-Control': 'max-age=31536000',
          }
        });
      } else if (config.type === 'gdrive') {
        const driveRes = await fetch(config.url, {
          method: 'GET',
          headers: config.headers || {},
        });

        if (!driveRes.ok) {
          return new Response('Failed to fetch from Google Drive', { status: driveRes.status });
        }
        
        const mimeType = driveRes.headers.get('content-type') || 'image/jpeg';
        response = new Response(driveRes.body, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'CDN-Cache-Control': 'max-age=31536000',
          }
        });
      } else if (config.type === 'cbz') {
        const { url: driveUrl, headers: driveHeaders, pageInfo } = config;

        const padding = 1024;
        const fetchStart = pageInfo.localHeaderOffset;
        const fetchEnd = pageInfo.localHeaderOffset + 30 + pageInfo.name.length + padding + pageInfo.compressedSize;

        const sliceRes = await fetch(driveUrl, {
          method: 'GET',
          headers: {
            ...driveHeaders,
            'Range': `bytes=${fetchStart}-${fetchEnd}`
          }
        });

        if (!sliceRes.ok && sliceRes.status !== 206) {
          return new Response('Failed to fetch CBZ slice', { status: sliceRes.status });
        }

        const buf = new Uint8Array(await sliceRes.arrayBuffer());
        
        if (buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
          return new Response('Invalid local file header signature', { status: 500 });
        }

        const fileNameLength = readUInt16LE(buf, 26);
        const extraFieldLength = readUInt16LE(buf, 28);
        const dataStart = 30 + fileNameLength + extraFieldLength;

        if (dataStart + pageInfo.compressedSize > buf.length) {
          return new Response('Local file header extra field too large', { status: 500 });
        }

        const compressedData = buf.subarray(dataStart, dataStart + pageInfo.compressedSize);
        
        let body: any;
        if (pageInfo.compressionMethod === 0) {
          body = compressedData;
        } else if (pageInfo.compressionMethod === 8) {
          const readable = new Response(compressedData).body;
          if (!readable) throw new Error('No readable stream');
          body = readable.pipeThrough(new DecompressionStream('deflate-raw'));
        } else {
          return new Response('Unsupported compression method', { status: 500 });
        }

        let mimeType = 'image/jpeg';
        const nameLower = pageInfo.name.toLowerCase();
        if (nameLower.endsWith('.png')) mimeType = 'image/png';
        else if (nameLower.endsWith('.webp')) mimeType = 'image/webp';
        else if (nameLower.endsWith('.gif')) mimeType = 'image/gif';
        else if (nameLower.endsWith('.avif')) mimeType = 'image/avif';

        response = new Response(body, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'CDN-Cache-Control': 'max-age=31536000',
          }
        });
      } else {
        return new Response('Unknown resolution type', { status: 400 });
      }

      // Cache the response asynchronously
      if (response.status === 200) {
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;

    } catch (e: any) {
      console.error(e);
      return new Response(e.message || 'Internal Server Error', { status: 500 });
    }
  }
};
