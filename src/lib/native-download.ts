import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
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

import { validatePdfFile } from '@/lib/file-validation';

/**
 * Downloads a single chapter file natively using @capacitor/file-transfer.
 * Uses the enhanced state machine: QUEUED → RESOLVING → DOWNLOADING → VALIDATING → COMPLETED
 */
async function executeSingleDownload(chapterId: string): Promise<void> {
  const store = useDownloadStore.getState();
  const currentState = store.downloads[chapterId];

  if (!currentState || !currentState.metadata) {
    store.markFailed(chapterId, 'No metadata for download');
    return;
  }

  // Skip if already completed or cancelled
  if (currentState.status === 'COMPLETED') return;
  if (currentState.status === 'CANCELLED') return;

  const { seriesId, seriesTitle, seriesSlug, chapterNumber } = currentState.metadata;
  const safeSeriesName = seriesTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  const filename = `Redbeard_${safeSeriesName}_Ch_${chapterNumber}.pdf`;
  const fullPath = `RedbeardDownloads/${filename}`;

  try {
    // Ensure download directory exists
    try {
      await Filesystem.mkdir({
        path: 'RedbeardDownloads',
        directory: Directory.Data,
        recursive: true
      });
    } catch {
      // Ignore if exists
    }

    // Update filename in metadata
    store.startDownload(chapterId, {
      ...currentState.metadata,
      filename,
    });

    const { FileTransfer } = await import('@capacitor/file-transfer');
    const { uri: absolutePath } = await Filesystem.getUri({
      path: fullPath,
      directory: Directory.Data
    });

    // ── RESOLVING ──────────────────────────────────────
    store.markResolving(chapterId);

    const resolveUrl = `/api/chapter/${chapterId}/download?resolve=true`;
    const { nativeFetch } = await import('@/lib/native/api');
    const res = await nativeFetch(resolveUrl);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const err: any = new Error(data.error?.message || `Failed to resolve URL (HTTP ${res.status})`);
      err.retryable = data.error?.retryable;
      throw err;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Backend returned invalid format (HTML). Ensure backend API is updated.');
    }

    if (!data.success || !data.downloadUrl) {
      const err: any = new Error(data.error?.message || 'Invalid resolve response');
      err.retryable = data.error?.retryable;
      throw err;
    }

    const currentUrl = data.downloadUrl;

    // ── DOWNLOADING ────────────────────────────────────
    store.startDownload(chapterId);

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

    // ── VALIDATING ─────────────────────────────────────
    store.markValidating(chapterId);

    const isValid = await validatePdfFile(fullPath);

    if (isValid && downloadResult.path) {
      store.markCompleted(chapterId, downloadResult.path);
    } else {
      // Clean up partial/invalid file
      try {
        await Filesystem.deleteFile({ path: fullPath, directory: Directory.Data });
      } catch {}
      const err: any = new Error('Invalid file content received. Expected PDF.');
      err.retryable = false; // Never retry on invalid content type
      throw err;
    }

  } catch (error: any) {
    // Clean up partial file on network error
    try {
      await Filesystem.deleteFile({ path: fullPath, directory: Directory.Data });
    } catch {}
    console.error('Native transfer setup/execution failed:', error);
    throw error;
  }
}

const MAX_ATTEMPTS = 3;
let isProcessing = false;

export async function enqueueAndProcess(
  chapterId: string,
  seriesId: string,
  seriesTitle: string,
  seriesSlug: string,
  chapterNumber: string | number,
  coverImage?: string,
  sourceType?: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.error('Cannot start native download outside of Capacitor app');
    return;
  }

  await verifyDownloadState(chapterId);

  // Read fresh state after verify
  const current = useDownloadStore.getState().downloads[chapterId];

  if (current?.status === 'COMPLETED') return;
  if (current && ['QUEUED', 'RESOLVING', 'DOWNLOADING', 'VALIDATING'].includes(current.status)) return;
  if (current?.status === 'CANCELLED') return;

  const safeSeriesName = seriesTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  useDownloadStore.getState().queueDownload(chapterId, {
    seriesId,
    seriesTitle,
    seriesSlug,
    chapterNumber,
    chapterId,
    filename: `Redbeard_${safeSeriesName}_Ch_${chapterNumber}.pdf`,
    coverImage,
    sourceType: sourceType as 'DOWNLOAD' | 'IMPORTED' | undefined,
  });

  void processQueue();
}

export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const store = useDownloadStore.getState();

      const next = Object.entries(store.downloads)
        .filter(([_, s]) => s.status === 'QUEUED')
        .sort(([, a], [, b]) => a.createdAt - b.createdAt)[0];

      if (!next) break;
      const [chapterId, item] = next;

      try {
        await executeSingleDownload(chapterId);
      } catch (err: any) {
        // Per-item catch
        const s = useDownloadStore.getState();
        const attempts = (s.downloads[chapterId]?.attempts ?? 0) + 1;
        const retryable = err?.retryable !== false;

        if (retryable && attempts < MAX_ATTEMPTS) {
          s.requeueDownload(chapterId);
          await new Promise(r => setTimeout(r, 2000 * attempts)); // backoff
        } else {
          s.markFailed(chapterId, err?.message ?? 'Download failed');
        }
      }
    }
  } finally {
    isProcessing = false;
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

    const isValid = await validatePdfFile(destPath);
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
