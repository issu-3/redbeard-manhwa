export interface ResolvedFile {
  success: boolean;
  fileName: string;
  mimeType: string;
  size: number | null;
  downloadUrl: string;
  expiresAt: number | null;
  provider: string;
  /** Headers the native client MUST send when fetching downloadUrl (e.g. User-Agent). */
  downloadHeaders?: Record<string, string>;
  /** Headers used only server-side for proxied downloads (e.g. cookies). Never sent to client. */
  serverHeaders?: Record<string, string>;
  /** If true, the download must be proxied through the server (e.g. TeraBox requires cookies). */
  requiresProxy?: boolean;
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
