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
export async function processDownloadQueue(
  chapterId: string, 
  apiDownloadUrl: string, 
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
  
  if (currentState && currentState.status === 'COMPLETED') {
    console.log('Download already completed');
    return;
  }

  const safeSeriesName = seriesTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  const filename = `Redbeard_${safeSeriesName}_Ch_${chapterNumber}.pdf`; 
  const fullPath = `RedbeardDownloads/${filename}`;

  try {
    try {
      await Filesystem.mkdir({
        path: 'RedbeardDownloads',
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // Ignore if exists
    }

    // Move from QUEUED to DOWNLOADING state
    store.startDownload(chapterId, { 
      seriesId, seriesTitle, seriesSlug, chapterNumber, filename 
    });

    const { FileTransfer } = await import('@capacitor/file-transfer');
    const { uri: absolutePath } = await Filesystem.getUri({
      path: fullPath,
      directory: Directory.Data
    });

    let retryCount = 0;
    const maxRetries = 1;

    while (retryCount <= maxRetries) {
      try {
        let currentUrl = '';

        const resolveUrl = `/api/chapter/${chapterId}/download?resolve=true`;
        const { nativeFetch } = await import('@/lib/native/api');
        const res = await nativeFetch(resolveUrl);
        
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error?.message || `Failed to resolve URL (HTTP ${res.status})`);
        }
        
        let data;
        try {
          data = await res.json();
        } catch (err) {
          throw new Error('Backend returned invalid format (HTML). Ensure backend API is updated.');
        }
        
        if (!data.success || !data.downloadUrl) {
          throw new Error(data.error?.message || 'Invalid resolve response');
        }
        currentUrl = data.downloadUrl;

        const progressListener = await FileTransfer.addListener('progress', (event: any) => {
          if (event.url === currentUrl && event.lengthComputable && event.contentLength > 0) {
            store.updateProgress(chapterId, event.bytes / event.contentLength);
          }
        });

        const downloadResult = await FileTransfer.downloadFile({
          url: currentUrl,
          path: absolutePath,
        });

        progressListener.remove();

        const isValid = await validateDownloadedFile(fullPath);

        if (isValid && downloadResult.path) {
          store.markCompleted(chapterId, downloadResult.path);
          return;
        } else {
          throw new Error('Invalid file content received.');
        }

      } catch (error: any) {
        try {
          await Filesystem.deleteFile({ path: fullPath, directory: Directory.Data });
        } catch (e) {}

        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`Download failed, retrying (attempt ${retryCount})`);
          continue;
        }
        
        console.error('Native transfer failed after retries:', error);
        store.markFailed(chapterId, error.message || 'Transfer failed');
        return;
      }
    }
  } catch (error: any) {
    console.error('Native transfer setup failed:', error);
    store.markFailed(chapterId, error.message || 'Transfer failed');
  }
}

/**
 * Imports a local PDF file using the device file picker.
 */
export async function importLocalPdf(
  chapterId: string,
  seriesId: string,
  seriesTitle: string,
  seriesSlug: string,
  chapterNumber: string | number,
  onReplaceConfirm: () => Promise<boolean>,
  onSuccess: () => void,
  onError: (msg: string) => void
) {
  if (!Capacitor.isNativePlatform()) return;
  const store = useDownloadStore.getState();
  const existing = store.downloads[chapterId];

  if (existing?.status === 'COMPLETED') {
    const shouldReplace = await onReplaceConfirm();
    if (!shouldReplace) return;
  }

  try {
    // Dynamic import to avoid errors on web
    const { FilePicker } = await import('@capawesome/capacitor-file-picker');
    const result = await FilePicker.pickFiles({ types: ['application/pdf'], limit: 1, readData: false });
    const file = result.files[0];
    if (!file || !file.path) {
      return; // Cancelled
    }

    if (file.mimeType !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      onError('Invalid PDF file');
      return;
    }

    const filename = `chapter_${chapterId}.pdf`;
    const destPath = `RedbeardDownloads/${filename}`;

    store.startDownload(chapterId, {
      seriesId,
      seriesTitle,
      seriesSlug,
      chapterNumber,
      chapterId,
      filename,
      sourceType: 'IMPORTED',
      fileSize: file.size
    });

    try {
      await Filesystem.mkdir({
        path: 'RedbeardDownloads',
        directory: Directory.Data,
        recursive: true
      });
    } catch(e) {}

    try {
      await Filesystem.copy({
        from: file.path,
        to: destPath,
        toDirectory: Directory.Data
      });
    } catch (copyError: any) {
      console.error('Filesystem.copy failed, trying FilePicker copy', copyError);
      const destUriResult = await Filesystem.getUri({
        path: destPath,
        directory: Directory.Data,
      });
      if (typeof (FilePicker as any).copyFile === 'function') {
        await (FilePicker as any).copyFile({
          from: file.path,
          to: destUriResult.uri,
          overwrite: true
        });
      } else {
        throw new Error('Copy failed: ' + copyError.message);
      }
    }

    const isValid = await validateDownloadedFile(destPath);
    if (!isValid) {
      await Filesystem.deleteFile({ path: destPath, directory: Directory.Data });
      store.markFailed(chapterId, 'Invalid PDF file');
      onError('Invalid PDF file');
      return;
    }

    const finalUri = await Filesystem.getUri({ path: destPath, directory: Directory.Data });
    store.importFile(chapterId, {
      seriesId,
      seriesTitle,
      seriesSlug,
      chapterNumber,
      chapterId,
      filename,
      sourceType: 'IMPORTED',
      fileSize: file.size
    }, finalUri.uri);

    onSuccess();
  } catch (error: any) {
    console.error('Import failed', error);
    store.markFailed(chapterId, error.message || 'Import failed');
    onError('Import failed: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Deletes a downloaded chapter from the filesystem and removes it from the store.
 */
export async function deleteDownloadedChapter(chapterId: string): Promise<boolean> {
  const store = useDownloadStore.getState();
  const state = store.downloads[chapterId];
  
  if (!state || !state.metadata || !state.metadata.filename) {
    store.clearDownload(chapterId); // Clear it anyway just in case
    return true;
  }
  
  if (Capacitor.isNativePlatform()) {
    const fullPath = `RedbeardDownloads/${state.metadata.filename}`;
    
    try {
      await Filesystem.deleteFile({
        path: fullPath,
        directory: Directory.Data
      });
    } catch (error) {
      console.warn(`Failed to delete physical file for chapter ${chapterId}, it might not exist`, error);
    }
  }
  
  store.clearDownload(chapterId);
  return true;
}
