import { FileResolver, ResolvedFile, inferMimeType } from './base';

export class GoogleDriveResolver implements FileResolver {
  canResolve(url: string): boolean {
    return url.includes('drive.google.com');
  }

  async resolve(url: string): Promise<ResolvedFile> {
    try {
      const fileId = this.extractFileId(url);
      
      if (!fileId) {
        return {
          success: false,
          fileName: '',
          mimeType: '',
          size: null,
          downloadUrl: '',
          expiresAt: null,
          provider: 'GDRIVE',
          error: {
            code: 'INVALID_URL',
            message: 'Could not extract Google Drive file ID from URL',
            retryable: false,
          },
        };
      }

      // The &confirm=t flag tells Google Drive to bypass the large file virus scan warning
      const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;

      return {
        success: true,
        fileName: `chapter-${fileId}.pdf`,
        mimeType: 'application/pdf', // Assuming PDFs for now
        size: null,
        // We will stream this directly on the Android side
        downloadUrl: directDownloadUrl,
        expiresAt: null,
        provider: 'GDRIVE',
        requiresProxy: false, // Google Drive allows direct downloads without CORS issues in native apps
      };
    } catch (e: any) {
      return {
        success: false,
        fileName: '',
        mimeType: '',
        size: null,
        downloadUrl: '',
        expiresAt: null,
        provider: 'GDRIVE',
        error: {
          code: 'GDRIVE_ERROR',
          message: e.message,
          retryable: true,
        }
      };
    }
  }

  private extractFileId(url: string): string | null {
    try {
      // Handle https://drive.google.com/file/d/ID/view
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return match[1];
      }
      
      // Handle https://drive.google.com/open?id=ID
      const parsedUrl = new URL(url);
      const id = parsedUrl.searchParams.get('id');
      if (id) {
        return id;
      }

      // Handle https://drive.google.com/uc?id=ID
      const ucId = parsedUrl.searchParams.get('id');
      if (ucId) {
        return ucId;
      }
    } catch {
      // Ignore URL parse errors
    }
    return null;
  }
}
