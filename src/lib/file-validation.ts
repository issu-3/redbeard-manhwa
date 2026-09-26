import { Filesystem, Directory } from '@capacitor/filesystem';

const PDF_MAGIC = '%PDF-';
const MIN_VALID_PDF = 64;

/**
 * PDF-only validation. Only reads the first 64 bytes to avoid OOM on large files.
 */
export async function validatePdfFile(fileName: string): Promise<boolean> {
  try {
    const stat = await Filesystem.stat({ path: fileName, directory: Directory.Data });

    if (stat.size < MIN_VALID_PDF) return false;

    const result = await Filesystem.readFile({
      path: fileName,
      directory: Directory.Data,
      offset: 0,
      length: 64,
    });

    const b64 = typeof result.data === 'string' ? result.data : '';
    console.log('read bytes (b64 len):', b64.length);
    if (!b64) return false;

    const safeLen = Math.floor(b64.length / 4) * 4;
    const head = atob(b64.substring(0, safeLen));

    if (head.startsWith(PDF_MAGIC)) return true;

    const lower = head.toLowerCase();
    if (lower.startsWith('<!doctype') || lower.startsWith('<html')) return false;

    return false;
  } catch (error: any) {
    console.error('[validatePdfFile]', error);
    return false;
  }
}
