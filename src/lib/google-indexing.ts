import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://redbeard.store';

/**
 * Loads service account credentials from environment variables or local .dev.vars fallback
 */
function getCredentials(): ServiceAccountCredentials | null {
  // 1. Check environment variables
  const rawEnv = process.env.GOOGLE_INDEXING_SERVICE_ACCOUNT || process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;
  if (rawEnv) {
    try {
      const parsed = JSON.parse(rawEnv);
      if (parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch {
      // Invalid JSON format in env var
    }
  }

  // 2. Local development fallback to apps/image-worker/.dev.vars
  try {
    const devVarsPath = path.join(process.cwd(), 'apps', 'image-worker', '.dev.vars');
    if (fs.existsSync(devVarsPath)) {
      const devVarsContent = fs.readFileSync(devVarsPath, 'utf8');
      const startIdx = devVarsContent.indexOf('GOOGLE_DRIVE_SERVICE_ACCOUNT');
      if (startIdx !== -1) {
        const jsonStart = devVarsContent.indexOf('{', startIdx);
        const nextVarMatch = devVarsContent.slice(jsonStart).search(/\n[A-Z0-9_]+=/);
        const jsonEnd =
          nextVarMatch !== -1
            ? jsonStart + devVarsContent.slice(jsonStart, jsonStart + nextVarMatch).lastIndexOf('}')
            : devVarsContent.lastIndexOf('}');
        const jsonString = devVarsContent.slice(jsonStart, jsonEnd + 1).trim();
        const parsed = JSON.parse(jsonString);
        if (parsed.client_email && parsed.private_key) {
          return parsed;
        }
      }
    }
  } catch {
    // Non-blocking fallback failure
  }

  return null;
}

/**
 * Appends successfully indexed URL to local indexed-urls.json if available
 */
function recordIndexedUrl(url: string) {
  try {
    const filePath = path.join(process.cwd(), 'indexed-urls.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data) && !data.includes(url)) {
        data.push(url);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      }
    }
  } catch {
    // Non-blocking in serverless/read-only environments
  }
}

/**
 * Submits URL(s) to the Google Indexing API with URL_UPDATED or URL_DELETED
 */
export async function notifyGoogleIndex(
  urls: string | string[],
  type: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED'
): Promise<void> {
  const urlList = (Array.isArray(urls) ? urls : [urls]).map((u) => {
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    return `${BASE_URL.replace(/\/$/, '')}/${u.replace(/^\//, '')}`;
  });

  if (urlList.length === 0) return;

  const credentials = getCredentials();
  if (!credentials) {
    console.warn('[GoogleIndexing] No service account credentials found. Skipping notification.');
    return;
  }

  try {
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    const indexing = google.indexing({ version: 'v3', auth });

    for (const url of urlList) {
      try {
        await indexing.urlNotifications.publish({
          requestBody: { url, type },
        });
        console.log(`[GoogleIndexing] Published ${type} for ${url}`);
        recordIndexedUrl(url);
      } catch (err: any) {
        console.error(`[GoogleIndexing] Failed to publish ${url}:`, err?.message || err);
      }
    }
  } catch (error: any) {
    console.error('[GoogleIndexing] Error during indexing publish:', error?.message || error);
  }
}

/**
 * Asynchronously notifies Google Indexing API when a series is created or updated
 */
export function notifySeriesPublished(seriesSlug: string): void {
  void notifyGoogleIndex([
    `/series/${seriesSlug}`,
    '/',
    '/browse/latest',
  ]);
}

/**
 * Asynchronously notifies Google Indexing API when a chapter is published
 */
export function notifyChapterPublished(seriesSlug: string, chapterSlug: string): void {
  void notifyGoogleIndex([
    `/series/${seriesSlug}/chapter/${chapterSlug}`,
    `/series/${seriesSlug}`,
    '/',
    '/browse/latest',
  ]);
}
