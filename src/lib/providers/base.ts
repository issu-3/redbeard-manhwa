export interface ResolvedFile {
  success: boolean;
  fileName: string;
  mimeType: string;
  size: number | null;
  downloadUrl: string;
  expiresAt: number | null;
  error?: {
    code: string;
    message: string;
  };
}

export interface FileResolver {
  canResolve(url: string): boolean;
  resolve(url: string): Promise<ResolvedFile>;
}
