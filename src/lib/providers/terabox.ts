import { FileResolver, ResolvedFile } from './base';

export class TeraBoxResolver implements FileResolver {
  canResolve(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      return host.includes('terabox.com') || 
             host.includes('teraboxapp.com') ||
             host.includes('1024tera.com') ||
             host.includes('terafileshare.com') ||
             host.includes('freeterabox.com') ||
             host.includes('terabox.app') ||
             host.includes('mirrobox.com') ||
             host.includes('nephobox.com');
    } catch {
      return false;
    }
  }

  async resolve(shareUrl: string): Promise<ResolvedFile> {
    // The NDUS cookie is required for the TeraBox API to work.
    // It should be provided via environment variables.
    const ndusCookie = process.env.TERABOX_NDUS_COOKIE;
    
    if (!ndusCookie) {
      return {
        success: false,
        fileName: '',
        mimeType: '',
        size: null,
        downloadUrl: '',
        expiresAt: null,
        error: {
          code: 'RESOLVER_UNAVAILABLE',
          message: 'TERABOX_NDUS_COOKIE is not configured on the server'
        }
      };
    }

    try {
      const parsedUrl = new URL(shareUrl);
      let surl = parsedUrl.searchParams.get("surl");
      if (!surl) {
        const match = parsedUrl.pathname.match(/\/s\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          surl = match[1];
        }
      }

      if (!surl) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'INVALID_URL',
            message: 'Could not extract surl from TeraBox URL'
          }
        };
      }

      let shortUrl = surl;
      if (surl.startsWith("1")) {
        shortUrl = surl.substring(1);
      }

      const cookieString = `ndus=${ndusCookie}`;
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36",
        "Cookie": cookieString,
      };

      const firstUrl = `https://dm.terabox.app/sharing/link?surl=${surl}`;
      
      const response = await fetch(firstUrl, { 
        headers,
        next: { revalidate: 0 } // no cache
      });
      
      if (!response.ok) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'RESOLVE_FAILED',
            message: `Failed to fetch TeraBox link page (HTTP ${response.status})`
          }
        };
      }

      const text = await response.text();
      const match = text.match(/fn%28%22(.*?)%22%29/);
      
      if (!match || !match[1]) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'TOKEN_NOT_FOUND',
            message: 'Failed to extract jsToken. Verification might be required or the cookie expired.'
          }
        };
      }
      
      const jsToken = match[1];

      const apiUrl = new URL("https://dm.terabox.app/share/list");
      apiUrl.searchParams.append("app_id", "250528");
      apiUrl.searchParams.append("jsToken", jsToken);
      apiUrl.searchParams.append("site_referer", "https://www.terabox.app/");
      apiUrl.searchParams.append("shorturl", shortUrl);
      apiUrl.searchParams.append("root", "1");

      const apiHeaders = {
        "Host": "dm.terabox.app",
        "User-Agent": headers["User-Agent"],
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "Referer": `https://dm.terabox.app/sharing/link?surl=${shortUrl}&clearCache=1`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://dm.terabox.app",
        "Cookie": cookieString,
      };

      const apiResponse = await fetch(apiUrl.toString(), {
        headers: apiHeaders,
        next: { revalidate: 0 }
      });

      if (!apiResponse.ok) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'API_FAILED',
            message: `TeraBox API request failed (HTTP ${apiResponse.status})`
          }
        };
      }

      const data = await apiResponse.json();

      if (data && data.error_code !== 0 && data.errno !== 0) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'API_ERROR',
            message: `TeraBox returned error code ${data.errno || data.error_code}`
          }
        };
      }

      if (!data || !data.list || data.list.length === 0) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'FILE_NOT_FOUND',
            message: 'No files found or file was deleted'
          }
        };
      }

      const firstItem = data.list[0];
      const downloadLink = firstItem.dlink;

      if (!downloadLink) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          error: {
            code: 'NO_DLINK',
            message: 'Direct download link missing from TeraBox response'
          }
        };
      }

      return {
        success: true,
        fileName: firstItem.server_filename || 'chapter.pdf',
        mimeType: 'application/pdf',
        size: firstItem.size || null,
        downloadUrl: downloadLink,
        expiresAt: null, // TeraBox download links often don't have an explicit expiry returned
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
