export interface Env {
  ORIGIN_URL: string;
  WORKER_SECRET: string;
}

function readUInt16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Only handle image requests
    if (!url.pathname.startsWith('/api/chapter/') || !url.pathname.includes('/page/')) {
      return fetch(request);
    }

    // 1. Check Cache
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), {
      method: 'GET',
    });
    
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }

    try {
      // 2. Fetch resolution info from Vercel Origin
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
        response = Response.redirect(config.url, 302);
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
