import { Filesystem, Directory } from '@capacitor/filesystem';

const PDF_MAGIC = '%PDF-';
const MIN_VALID_FILE = 64;

export type SupportedFileType = 'pdf' | 'cbz' | null;

/**
 * Validates the file and returns its type ('pdf' or 'cbz').
 * Only reads the first 64 bytes to avoid OOM on large files.
 */
export async function validateDownloadedFile(fileName: string): Promise<SupportedFileType> {
  try {
    const stat = await Filesystem.stat({ path: fileName, directory: Directory.Data });

    if (stat.size < MIN_VALID_FILE) return null;

    const result = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Data,
      offset: 0,
      length: 64,
    });

    const b64 = typeof result.data === 'string' ? result.data : '';
    if (!b64) return null;

    const safeLen = Math.floor(b64.length / 4) * 4;
    const head = atob(b64.substring(0, safeLen));

    // Check PDF
    if (head.startsWith(PDF_MAGIC)) return 'pdf';

    // Check ZIP / CBZ magic numbers: PK\x03\x04
    if (head.charCodeAt(0) === 0x50 && head.charCodeAt(1) === 0x4B && head.charCodeAt(2) === 0x03 && head.charCodeAt(3) === 0x04) {
      return 'cbz';
    }
    
    // Some ZIP files might start with an empty header or other variants, but PK\x03\x04 is standard.

    return null;
  } catch (error: any) {
    console.error('[validateDownloadedFile]', error);
    return null;
  }
}

// Keep validatePdfFile for backwards compatibility if used elsewhere, 
// but it should probably just call validateDownloadedFile.
export async function validatePdfFile(fileName: string): Promise<boolean> {
  const type = await validateDownloadedFile(fileName);
  return type === 'pdf';
}
