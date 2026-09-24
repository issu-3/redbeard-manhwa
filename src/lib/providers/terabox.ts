import { FileResolver, ResolvedFile } from './base';

export class TeraBoxResolver implements FileResolver {
  canResolve(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname.includes('terabox.com') || parsed.hostname.includes('teraboxapp.com');
    } catch {
      return false;
    }
  }

  async resolve(shareUrl: string): Promise<ResolvedFile> {
    const token = process.env.TERAGRAB_API_TOKEN;
    if (!token) {
      return {
        success: false,
        fileName: '',
        mimeType: '',
        size: null,
        downloadUrl: '',
        expiresAt: null,
        error: {
          code: 'RESOLVER_UNAVAILABLE',
          message: 'TERAGRAB_API_TOKEN is not configured on the server'
        }
      };
    }

    try {
      const response = await fetch(`https://teragrab.com/api/v1/resolve?url=${encodeURIComponent(shareUrl)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        // Do not cache these requests permanently
        next: { revalidate: 60 }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let message = 'Failed to resolve TeraBox URL';
        let code = 'RESOLVE_FAILED';

        switch (response.status) {
          case 400: message = 'Invalid TeraBox URL'; code = 'INVALID_URL'; break;
          case 401: message = 'Unauthorized (TeraGrab API)'; code = 'RESOLVER_UNAUTHORIZED'; break;
          case 402: message = 'Insufficient credits (TeraGrab API)'; code = 'RESOLVER_QUOTA_EXCEEDED'; break;
          case 403: message = 'Plan required (TeraGrab API)'; code = 'RESOLVER_QUOTA_EXCEEDED'; break;
          case 404: message = 'File not found or deleted on TeraBox'; code = 'FILE_NOT_FOUND'; break;
          case 429: message = 'Rate limited (TeraGrab API)'; code = 'RATE_LIMITED'; break;
          case 500: message = 'TeraGrab server error'; code = 'RESOLVER_ERROR'; break;
        }

        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code,
            message: errorData.error || message
          }
        };
      }

      const data = await response.json();

      if (!data.ok || !data.download_url) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'INVALID_RESPONSE',
            message: 'Invalid response from TeraGrab'
          }
        };
      }

      return {
        success: true,
        fileName: data.filename || 'chapter.pdf',
        mimeType: 'application/pdf',
        size: data.size_bytes || null,
        downloadUrl: data.download_url,
        expiresAt: data.expires_at || null,
      };
    } catch (error: any) {
      console.error('TeraBox Resolution Error:', error);
      return {
        success: false,
        fileName: '',
        mimeType: '',
        size: null,
        downloadUrl: '',
        expiresAt: null,
        error: {
          code: 'NETWORK_ERROR',
          message: error.message || 'Unknown network error'
        }
      };
    }
  }
}
