export interface ResolvedFile {
  success: boolean;
  fileName: string;
  mimeType: string;
  size: number | null;
  downloadUrl: string;
  expiresAt: number | null;
  provider: string;
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
  };
}

export interface FileResolver {
  canResolve(url: string): boolean;
  resolve(url: string): Promise<ResolvedFile>;
}

export function inferMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
}
