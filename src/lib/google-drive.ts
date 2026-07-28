import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import type { BackupScheduleConfig } from '@/types/backup';

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

/**
 * Retrieves Google Drive configuration from database settings or environment variables
 */
export async function getGoogleDriveConfig(): Promise<{
  enabled: boolean;
  credentials?: ServiceAccountCredentials;
  rootFolderId?: string;
}> {
  try {
    const setting = await prisma.siteSetting.findUnique({ where: { key: 'backup_config' } });
    if (setting?.value) {
      const config: BackupScheduleConfig = JSON.parse(setting.value);
      if (config.driveEnabled && config.driveServiceAccountJson) {
        const credentials = JSON.parse(config.driveServiceAccountJson) as ServiceAccountCredentials;
        return { enabled: true, credentials, rootFolderId: config.driveFolderId };
      }
    }
  } catch (e) {
    console.warn(`[GoogleDrive] Error loading DB config:`, e);
  }

  // Fallback to env vars
  const envJson = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
  if (envJson) {
    try {
      const credentials = JSON.parse(envJson) as ServiceAccountCredentials;
      return {
        enabled: true,
        credentials,
        rootFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
      };
    } catch (e) {
      console.warn(`[GoogleDrive] Invalid GOOGLE_DRIVE_SERVICE_ACCOUNT env var.`);
    }
  }

  return { enabled: false };
}

/**
 * Generates an OAuth2 access token for Google Drive API using JWT Bearer grant
 */
async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: credentials.token_uri || 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive',
  };

  const token = jwt.sign(payload, credentials.private_key, { algorithm: 'RS256' });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google OAuth failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Finds an existing folder by name inside a parent, or creates it if missing
 */
async function getOrCreateFolder(name: string, accessToken: string, parentId?: string): Promise<string> {
  const parentQuery = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const query = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and ${parentQuery} and trashed = false`;

  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder "${name}": ${errText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Resolves or creates the folder hierarchy: REDBEARD -> Database Backups -> {Subfolder}
 */
export async function resolveBackupDirectory(subfolder: string, accessToken: string, rootFolderId?: string): Promise<string> {
  let parentId = rootFolderId;

  if (!parentId) {
    // 1. Create/find REDBEARD
    parentId = await getOrCreateFolder('REDBEARD', accessToken);
  }

  // 2. Create/find Database Backups
  const dbBackupsId = await getOrCreateFolder('Database Backups', accessToken, parentId);

  // 3. Create/find specific subfolder (Daily, Weekly, Monthly, Manual, etc.)
  const targetId = await getOrCreateFolder(subfolder, accessToken, dbBackupsId);

  return targetId;
}

/**
 * Uploads a database backup file to Google Drive
 */
export async function uploadBackupToDrive(
  fileName: string,
  content: string,
  subfolder: 'Daily' | 'Weekly' | 'Monthly' | 'Manual' | 'Pre-Deploy' | 'Recovery'
): Promise<{ success: boolean; fileId?: string; webViewLink?: string; error?: string }> {
  try {
    const config = await getGoogleDriveConfig();
    if (!config.enabled || !config.credentials) {
      return { success: false, error: 'Google Drive integration not configured or disabled.' };
    }

    const accessToken = await getAccessToken(config.credentials);
    const targetFolderId = await resolveBackupDirectory(subfolder, accessToken, config.rootFolderId);

    // Multipart upload
    const boundary = `-------DriveBackupBoundary_${Date.now()}`;
    const metadata = {
      name: fileName,
      parents: [targetFolderId],
      description: `REDBEARD Automated ${subfolder} Database Backup`,
    };

    let mimeType = 'text/plain';
    if (fileName.endsWith('.sql')) mimeType = 'application/sql';
    if (fileName.endsWith('.json')) mimeType = 'application/json';

    const multipartBody = 
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Drive upload failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData = await uploadRes.json();
    return {
      success: true,
      fileId: uploadData.id,
      webViewLink: uploadData.webViewLink || `https://drive.google.com/file/d/${uploadData.id}/view`,
    };
  } catch (error: any) {
    console.error(`[GoogleDrive] Upload error:`, error.message);
    return { success: false, error: error.message };
  }
}
