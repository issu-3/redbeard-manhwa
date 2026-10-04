import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useDownloadStore, MAX_LIFETIME_ATTEMPTS } from '../store/download-store';

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

import { validateDownloadedFile } from '@/lib/file-validation';

/**
 * Tracks in-flight transfers so they can be aborted on cancel.
 * Maps chapterId → AbortController (or a cleanup function).
 */
const activeTransfers = new Map<string, { abort: () => void }>();

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
  // Initially save as .tmp to validate later
  const tempFilename = `Redbeard_${safeSeriesName}_Ch_${chapterNumber}.tmp`;
  const fullPath = `RedbeardDownloads/${tempFilename}`;

  let progressListener: { remove: () => void } | null = null;

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

    // Check if cancelled during resolve
    if (useDownloadStore.getState().downloads[chapterId]?.status === 'CANCELLED') return;

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

    // If the server returned a relative proxy URL, prepend the API base
    let currentUrl = data.downloadUrl;
    if (currentUrl.startsWith('/')) {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://redbeard.store';
      currentUrl = `${API_BASE_URL}${currentUrl}`;
    }
    const downloadHeaders: Record<string, string> = data.downloadHeaders || {};

    // ── DOWNLOADING ────────────────────────────────────
    store.startDownload(chapterId);

    progressListener = await FileTransfer.addListener('progress', (event: any) => {
      if (event.url === currentUrl && event.lengthComputable && event.contentLength > 0) {
        store.updateProgress(chapterId, event.bytes / event.contentLength);
      }
    });

    // Register for cancellation
    activeTransfers.set(chapterId, {
      abort: () => {}
    });

    const downloadResult = await FileTransfer.downloadFile({
      url: currentUrl,
      path: absolutePath,
      progress: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/145.0.0.0 Mobile Safari/537.36',
        ...downloadHeaders,
      },
    });

    // Check if cancelled during download
    if (useDownloadStore.getState().downloads[chapterId]?.status === 'CANCELLED') {
      try {
        await Filesystem.deleteFile({ path: fullPath, directory: Directory.Data });
      } catch {}
      return;
    }

    // ── VALIDATING ─────────────────────────────────────
    store.markValidating(chapterId);

    const fileType = await validateDownloadedFile(fullPath);

    if (fileType && downloadResult.path) {
      // Rename based on type
      const finalFilename = `Redbeard_${safeSeriesName}_Ch_${chapterNumber}.${fileType}`;
      const finalPath = `RedbeardDownloads/${finalFilename}`;
      
      await Filesystem.rename({
        from: fullPath,
        to: finalPath,
        directory: Directory.Data
      });

      // Update filename in metadata
      store.startDownload(chapterId, {
        ...currentState.metadata,
        filename: finalFilename,
      });

      const { uri: finalUri } = await Filesystem.getUri({
        path: finalPath,
        directory: Directory.Data
      });
      store.markCompleted(chapterId, finalUri);
    } else {
      // Clean up partial/invalid file
      try {
        await Filesystem.deleteFile({ path: fullPath, directory: Directory.Data });
      } catch {}
      const err: any = new Error('Invalid file content received. Expected PDF or CBZ.');
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
  } finally {
    // Always clean up the progress listener
    if (progressListener) {
      progressListener.remove();
    }
    activeTransfers.delete(chapterId);
  }
}

const MAX_ATTEMPTS_PER_CYCLE = 3;
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
      const [chapterId] = next;

      try {
        await executeSingleDownload(chapterId);
      } catch (err: any) {
        // Per-item catch
        const s = useDownloadStore.getState();
        const attempts = (s.downloads[chapterId]?.attempts ?? 0) + 1;
        const retryable = err?.retryable !== false;

        if (retryable && attempts < MAX_ATTEMPTS_PER_CYCLE && attempts < MAX_LIFETIME_ATTEMPTS) {
          s.requeueDownload(chapterId);
          await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempts), 16000))); // exponential backoff, capped at 16s
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
 * Cancel an in-progress or queued download.
 * Marks the download as CANCELLED and cleans up partial files.
 */
export function cancelDownload(chapterId: string): void {
  const store = useDownloadStore.getState();
  const state = store.downloads[chapterId];
  if (!state) return;

  // Mark cancelled first — executeSingleDownload checks this
  store.markCancelled(chapterId);

  // Abort any in-flight transfer
  const active = activeTransfers.get(chapterId);
  if (active) {
    active.abort();
    activeTransfers.delete(chapterId);
  }

  // Clean up partial file if we have metadata
  if (state.metadata?.filename) {
    const fullPath = `RedbeardDownloads/${state.metadata.filename}`;
    Filesystem.deleteFile({ path: fullPath, directory: Directory.Data }).catch(() => {});
  }

  store.clearDownload(chapterId);
}

/**
 * Imports a local PDF or CBZ file using the device file picker.
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
    // On some Android versions, mime types like application/zip or application/x-cbz might not map well, so we use general types
    const result = await FilePicker.pickFiles({ types: ['application/pdf', 'application/zip', 'application/x-cbz', 'application/vnd.comicbook+zip', 'application/octet-stream'], limit: 1, readData: false });
    const file = result.files[0];
    if (!file || !file.path) {
      return; // Cancelled
    }

    const nameLower = file.name.toLowerCase();
    const isPdf = file.mimeType === 'application/pdf' || nameLower.endsWith('.pdf');
    const isCbz = nameLower.endsWith('.cbz') || nameLower.endsWith('.zip') || file.mimeType?.includes('zip') || file.mimeType?.includes('cbz');

    if (!isPdf && !isCbz) {
      onError('Invalid file type. Please select a PDF or CBZ file.');
      return;
    }

    const tempFilename = `chapter_${chapterId}.tmp`;
    const destPath = `RedbeardDownloads/${tempFilename}`;

    store.startDownload(chapterId, {
      seriesId,
      seriesTitle,
      seriesSlug,
      chapterNumber,
      chapterId,
      filename: tempFilename,
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

    const fileType = await validateDownloadedFile(destPath);
    if (!fileType) {
      await Filesystem.deleteFile({ path: destPath, directory: Directory.Data });
      store.markFailed(chapterId, 'Invalid file content');
      onError('Invalid file content. Not a valid PDF or CBZ.');
      return;
    }

    const finalFilename = `chapter_${chapterId}.${fileType}`;
    const finalPath = `RedbeardDownloads/${finalFilename}`;
    
    await Filesystem.rename({
      from: destPath,
      to: finalPath,
      directory: Directory.Data
    });

    const finalUri = await Filesystem.getUri({ path: finalPath, directory: Directory.Data });
    store.importFile(chapterId, {
      seriesId,
      seriesTitle,
      seriesSlug,
      chapterNumber,
      chapterId,
      filename: finalFilename,
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
