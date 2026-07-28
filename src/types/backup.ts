export interface BlobVerificationReport {
  totalChecked: number;
  validCount: number;
  missingUrls: string[];
}

export interface BackupVerificationResult {
  valid: boolean;
  format: 'SQL' | 'JSON';
  recordCount: number;
  sizeBytes: number;
  tableCounts: Record<string, number>;
  blobReport?: BlobVerificationReport;
  errorMessage?: string;
}

export interface BackupLogData {
  id: string;
  fileName: string;
  format: 'SQL' | 'JSON';
  type: 'MANUAL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'PRE_DEPLOY' | 'RECOVERY_TEST';
  sizeBytes: number;
  recordCount: number;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'VERIFIED' | 'RESTORED';
  driveFileId?: string | null;
  driveUrl?: string | null;
  errorMessage?: string | null;
  metadata?: {
    tableCounts?: Record<string, number>;
    blobReport?: BlobVerificationReport;
  } | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface BackupScheduleConfig {
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  monthlyEnabled: boolean;
  driveEnabled: boolean;
  driveFolderId?: string;
  driveServiceAccountJson?: string;
  notifyOnFailure: boolean;
}
