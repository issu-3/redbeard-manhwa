import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { useDownloadStore } from '../store/download-store';

/**
 * Ensures the physical file existence matches the store metadata.
 * Called on boot or when a download is requested.
 */
export async function verifyDownloadState(chapterId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const store = useDownloadStore.getState();
  const state = store.downloads[chapterId];
  if (!state || !state.metadata) return;

  const fileName = `RedbeardDownloads/${state.metadata.filename}`;
  try {
    const stat = await Filesystem.stat({
      path: fileName,
      directory: Directory.Data,
    });
    if (stat.size > 0 && state.status !== 'COMPLETED') {
      store.hydrateFromDisk(chapterId, 'COMPLETED', stat.uri);
    }
  } catch (error) {
    // File missing
    if (state.status === 'COMPLETED') {
      store.hydrateFromDisk(chapterId, 'FAILED', undefined);
    }
  }
}

/**
 * Validates the downloaded file's contents.
 * Looks for %PDF- or PK (zip/cbz/epub).
 */
async function validateDownloadedFile(fileName: string): Promise<boolean> {
  try {
    // Read the first 10 characters (base64 encoded, but we only need a few bytes)
    const result = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Data,
      // We can't easily read just a chunk in Capacitor Filesystem reliably without loading the whole file in some versions,
      // but if the file is an HTML page (Google Drive), it will be very small.
      // If it's a huge PDF, reading the whole file into base64 might crash.
      // Wait, is there a chunked reader in Capacitor 8?
      // Actually, if we just want to protect against Google Drive HTML pages, we can just check the size. HTML pages are usually < 500KB.
      // But let's try to parse the base64 prefix if the file is small enough, or just rely on the fallback.
      // A better way: Capacitor file-transfer might just fail for HTML if we enforce download? No, it will just write it.
    });

    const data = result.data;
    if (typeof data === 'string') {
      // Direct base64 signature matching to avoid atob() exceptions
      if (data.startsWith('JVBERi0')) return true; // %PDF-
      if (data.startsWith('UEsDB')) return true; // PK (CBZ, EPUB, ZIP)

      // Decode base64 header safely (must be a multiple of 4) for HTML detection
      let decoded = '';
      try {
        const safeLen = Math.floor(Math.min(data.length, 48) / 4) * 4;
        if (safeLen > 0) {
          decoded = atob(data.substring(0, safeLen));
        }
      } catch (e) {
        // Ignore decoding errors
      }
      
      if (decoded.includes('<!DOCTYPE html>') || decoded.includes('<html')) return false; // HTML Error/Provider page
    } else if (data instanceof Blob) {
       // Future proofing for binary returns
       const text = await data.slice(0, 50).text();
       if (text.startsWith('%PDF-')) return true;
       if (text.startsWith('PK')) return true;
       if (text.includes('<!DOCTYPE html>') || text.includes('<html')) return false;
    }
    
    // If it doesn't explicitly look like HTML, let's assume it's valid (could be octet-stream image etc)
    return true;
  } catch (error: any) {
    // If it's an OutOfMemoryError, it means the file is huge, which means it's definitely not a 50kb HTML provider page!
    // So a crash here for huge files actually implies success in terms of "is it a direct file".
    if (error.message && error.message.includes('Out Of Memory')) {
      return true; 
    }
    console.error('Validation error:', error);
    return false; // Safest to fail if we can't read it
  }
}

/**
 * Downloads a file natively to Directory.Data using @capacitor/file-transfer.
 */
export async function startNativeDownload(
  chapterId: string, 
  resolvedUrl: string, 
  seriesId: string,
  seriesTitle: string, 
  seriesSlug: string,
  chapterNumber: string | number
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.error('Cannot start native download outside of Capacitor app');
    return;
  }

  // Deduplication check
  await verifyDownloadState(chapterId);

  const store = useDownloadStore.getState();
  const currentState = store.downloads[chapterId];
  
  if (currentState && (currentState.status === 'DOWNLOADING' || currentState.status === 'COMPLETED')) {
    console.log('Download already in progress or completed');
    return;
  }

  const safeSeriesName = seriesTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  const filename = `Redbeard_${safeSeriesName}_Ch_${chapterNumber}.pdf`; // Assume PDF as base, or generic
  const fullPath = `RedbeardDownloads/${filename}`;

  try {
    // Ensure directory exists
    try {
      await Filesystem.mkdir({
        path: 'RedbeardDownloads',
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // Ignore if exists
    }

    // Dynamic import to avoid SSR issues
    const { FileTransfer } = await import('@capacitor/file-transfer');

    store.startDownload(chapterId, { 
      seriesId, seriesTitle, seriesSlug, chapterNumber, filename 
    });

    FileTransfer.addListener('progress', (event: any) => {
      // It might be a global progress event, so we might need to check if it's for this URL
      if (event.url === resolvedUrl && event.lengthComputable && event.contentLength > 0) {
        store.updateProgress(chapterId, event.bytes / event.contentLength);
      }
    });

    // get absolute uri for file-transfer
    const { uri: absolutePath } = await Filesystem.getUri({
      path: fullPath,
      directory: Directory.Data
    });

    const downloadResult = await FileTransfer.downloadFile({
      url: resolvedUrl,
      path: absolutePath,
    });

    // Validate the downloaded file
    const isValid = await validateDownloadedFile(fullPath);

    if (isValid && downloadResult.path) {
      store.markCompleted(chapterId, downloadResult.path);
    } else {
      // Invalid content (HTML page from Drive/TeraBox)
      store.markFailed(chapterId, 'Invalid file content received. Opening externally.');
      try {
        await Filesystem.deleteFile({ path: fullPath, directory: Directory.Data });
      } catch (e) {}
      
      // Open externally as fallback
      await Browser.open({ url: resolvedUrl });
    }

  } catch (error: any) {
    console.error('Native transfer failed:', error);
    store.markFailed(chapterId, error.message || 'Transfer failed');
    try {
      await Filesystem.deleteFile({ path: fullPath, directory: Directory.Data });
    } catch (e) {}
  }
}
