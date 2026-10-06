import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGoogleDriveConfig, getAccessToken } from '@/lib/google-drive';
import { getRemoteFileSize, getRemoteCbzMetadata } from '@/lib/cbz-remote';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { fileId, fileName, apiKey } = await req.json();
    if (!fileId || !fileName) {
      return NextResponse.json({ error: 'Missing fileId or fileName' }, { status: 400 });
    }

    const config = await getGoogleDriveConfig();
    let authHeader = '';
    let finalApiKey = process.env.GOOGLE_API_KEY || apiKey;

    if (config.enabled && config.credentials) {
      const token = await getAccessToken(config.credentials);
      authHeader = `Bearer ${token}`;
    } else if (finalApiKey) {
      authHeader = ``;
    } else {
      return NextResponse.json({ error: 'NEEDS_API_KEY' }, { status: 400 });
    }

    const authQuery = authHeader ? '' : `&key=${finalApiKey}`;
    const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

    // 1. Fetch metadata using range requests instead of downloading the whole archive
    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${authQuery}`;
    
    let fileSize: number;
    try {
      fileSize = await getRemoteFileSize(driveUrl, headers);
    } catch (e: any) {
      console.error("Drive file size error:", e);
      return NextResponse.json({ error: `Failed to access archive from Google Drive.` }, { status: 400 });
    }

    let metadata;
    try {
      metadata = await getRemoteCbzMetadata(driveUrl, headers, fileSize);
    } catch (e: any) {
      console.error("Drive metadata error:", e);
      return NextResponse.json({ error: `Failed to parse archive metadata from Google Drive.` }, { status: 400 });
    }

    if (!metadata.pages || metadata.pages.length === 0) {
       return NextResponse.json({ error: 'No images found in the archive.' }, { status: 400 });
    }

    // 3. We no longer upload extracted images to R2 during import.
    // Instead, we return stable source references so Google Drive remains the MASTER source.
    // The reader API will lazily extract and cache these to R2 on the first read.
    const urls = metadata.pages.map(page => `gdrive-archive:${fileId}:${page.name}`);

    return NextResponse.json({ success: true, urls });
  } catch (error: any) {
    console.error('Import Archive Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import archive' }, { status: 500 });
  }
}
