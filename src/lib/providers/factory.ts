import { FileResolver, ResolvedFile, inferMimeType } from './base';
import { TeraBoxResolver } from './terabox';

/**
 * Catch-all resolver for direct HTTP/HTTPS URLs.
 * Passes the URL through with MIME inference from the filename.
 * Registered last so specific resolvers (TeraBox, etc.) get priority.
 */
const PRIVATE_HOST = /^(localhost$|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|\[)/;

class DirectResolver implements FileResolver {
  canResolve(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
      return !PRIVATE_HOST.test(parsed.hostname);
    } catch {
      return false;
    }
  }

  async resolve(url: string): Promise<ResolvedFile> {
    const pathSegment = new URL(url).pathname.split('/').pop()?.split('?')[0] || '';
    const filename = pathSegment || 'chapter.pdf';

    return {
      success: true,
      fileName: filename,
      mimeType: inferMimeType(filename),
      size: null,
      downloadUrl: url,
      expiresAt: null,
      provider: 'DIRECT',
    };
  }
}

export class ResolverManager {
  private resolvers: FileResolver[] = [];

  constructor() {
    // Order matters: specific providers first, catch-all last
    this.resolvers.push(new TeraBoxResolver());
    this.resolvers.push(new DirectResolver());
    // Future resolvers: GoogleDriveResolver, R2Resolver, etc.
  }

  getResolver(url: string): FileResolver | null {
    for (const resolver of this.resolvers) {
      if (resolver.canResolve(url)) {
        return resolver;
      }
    }
    return null;
  }
}

export const resolverManager = new ResolverManager();

