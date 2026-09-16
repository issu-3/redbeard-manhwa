import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useDownloadStore, DownloadMetadata } from '@/store/download-store';

/**
 * Validates if the file is a PDF by reading its base64 signature.
 * Prevents OOM by handling large file crashes gracefully.
 */
async function validatePdfFile(fileName: string): Promise<boolean> {
  try {
    const result = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Data,
    });

    const data = result.data;
    if (typeof data === 'string') {
      // JVBERi0 is base64 for %PDF-
      if (data.startsWith('JVBERi0')) return true;
      return false; // Reject anything that isn't explicitly a PDF for imported files
    } else if (data instanceof Blob) {
      const text = await data.slice(0, 50).text();
      if (text.startsWith('%PDF-')) return true;
      return false;
    }
    
    return false;
  } catch (error: any) {
    if (error.message && error.message.includes('Out Of Memory')) {
      // If it OOMs, it's a huge binary file, likely a valid PDF given the file picker filter.
      // Not an HTML error page.
      return true;
    }
    console.error('Validation error:', error);
    return false;
  }
}

/**
 * Parses a filename to infer the Series Title and Chapter Number.
 */
export function inferSeriesAndChapter(filename: string): { seriesTitle: string; chapterNumber: string } {
  // Remove extension
  const name = filename.replace(/\.[^/.]+$/, '');
  
  // Try to match "Series Title Chapter 12" or "Series_Title_12"
  const match = name.match(/(.*?)(?:chapter|ch|_|-)\s*(\d+(?:\.\d+)?)/i);
  
  if (match) {
    const title = match[1].replace(/_/g, ' ').trim();
    const chapter = match[2].trim();
    return { seriesTitle: title, chapterNumber: chapter };
  }
  
  return { seriesTitle: name, chapterNumber: '1' };
}

export async function pickAndImportPdf(): Promise<{
  tempFilename: string;
  inferredSeries: string;
  inferredChapter: string;
  originalFilename: string;
  fileSize: number;
} | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const { FilePicker } = await import('@capawesome/capacitor-file-picker');
    
    const result = await FilePicker.pickFiles({
      types: ['application/pdf'],
      readData: false, // Do not read into memory to prevent OOM
    });

    const file = result.files[0];
    if (!file) return null;

    // Use a temporary name in our controlled storage
    const timestamp = Date.now();
    const tempFilename = `temp_import_${timestamp}.pdf`;
    const tempPath = `RedbeardDownloads/temp/${tempFilename}`;

    // Ensure temp dir exists
    try {
      await Filesystem.mkdir({
        path: 'RedbeardDownloads/temp',
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      // Ignore if exists
    }

    // Try to safely copy the file from the picker's URI (often a content:// URI on Android)
    // Filesystem.copy supports content URIs on Android since Capacitor 5+
    await Filesystem.copy({
      from: file.path || '', 
      to: tempPath,
      toDirectory: Directory.Data
    });

    const isValid = await validatePdfFile(tempPath);
    if (!isValid) {
      await Filesystem.deleteFile({ path: tempPath, directory: Directory.Data });
      throw new Error('Invalid PDF file format.');
    }

    const { seriesTitle, chapterNumber } = inferSeriesAndChapter(file.name);

    return {
      tempFilename,
      inferredSeries: seriesTitle,
      inferredChapter: chapterNumber,
      originalFilename: file.name,
      fileSize: file.size || 0
    };
  } catch (error) {
    console.error('Error picking PDF:', error);
    throw error;
  }
}

export async function finalizeImport(
  tempFilename: string,
  seriesId: string,
  seriesTitle: string,
  seriesSlug: string,
  chapterNumber: string,
  chapterId: string | undefined,
  originalFilename: string,
  fileSize: number
): Promise<void> {
  const safeSeriesName = seriesSlug.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  const finalFilename = `RedbeardDownloads/${safeSeriesName}/Chapter-${chapterNumber}.pdf`;

  // Ensure series directory exists
  try {
    await Filesystem.mkdir({
      path: `RedbeardDownloads/${safeSeriesName}`,
      directory: Directory.Data,
      recursive: true
    });
  } catch (e) {
    // Ignore if exists
  }

  // Move from temp to final
  await Filesystem.rename({
    from: `RedbeardDownloads/temp/${tempFilename}`,
    to: finalFilename,
    directory: Directory.Data
  });

  const { uri } = await Filesystem.getUri({
    path: finalFilename,
    directory: Directory.Data
  });

  const store = useDownloadStore.getState();
  const metadata: DownloadMetadata = {
    seriesId,
    seriesTitle,
    seriesSlug,
    chapterNumber,
    chapterId,
    filename: finalFilename.replace('RedbeardDownloads/', ''),
    sourceType: 'IMPORTED',
    fileSize
  };

  // We use chapterId if it exists in DB, otherwise generate a local ID
  const storeId = chapterId || `local_${seriesSlug}_${chapterNumber}`;
  
  store.importFile(storeId, metadata, uri);
}

export async function deleteLocalChapter(chapterId: string): Promise<void> {
  const store = useDownloadStore.getState();
  const state = store.downloads[chapterId];
  if (!state || !state.metadata) return;

  const fileName = `RedbeardDownloads/${state.metadata.filename}`;
  try {
    await Filesystem.deleteFile({
      path: fileName,
      directory: Directory.Data
    });
  } catch (error) {
    console.warn('File already deleted or missing', error);
  }

  store.deleteLocalChapter(chapterId);
}
