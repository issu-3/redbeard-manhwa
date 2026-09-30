import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { put } from '@vercel/blob';
import { getGoogleDriveConfig, getAccessToken } from '@/lib/google-drive';
import JSZip from 'jszip';

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

    // 1. Download the archive from Google Drive
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${authQuery}`, { headers });
    
    if (!driveRes.ok) {
       const err = await driveRes.text();
       console.error("Drive download error:", err);
       return NextResponse.json({ error: `Failed to download archive from Google Drive.` }, { status: 400 });
    }

    const arrayBuffer = await driveRes.arrayBuffer();

    // 2. Extract with JSZip
    const zip = await JSZip.loadAsync(arrayBuffer);
    const imageFiles: JSZip.JSZipObject[] = [];

    zip.forEach((relativePath, file) => {
      if (!file.dir && /\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
        // ignore macOS hidden files
        if (!file.name.includes('__MACOSX') && !file.name.split('/').pop()?.startsWith('.')) {
           imageFiles.push(file);
        }
      }
    });

    if (imageFiles.length === 0) {
       return NextResponse.json({ error: 'No images found in the archive.' }, { status: 400 });
    }

    // Sort images naturally
    imageFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    // 3. Upload extracted images to Vercel Blob sequentially to avoid overwhelming
    const urls: string[] = [];
    for (const file of imageFiles) {
      const buffer = await file.async('nodebuffer');
      const ext = file.name.split('.').pop() || 'jpg';
      const safeName = `extracted-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      
      const blob = await put(`chapters/${safeName}`, buffer, {
         access: 'public',
         addRandomSuffix: false
      });
      urls.push(blob.url);
    }

    return NextResponse.json({ success: true, urls });
  } catch (error: any) {
    console.error('Import Archive Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to import archive' }, { status: 500 });
  }
}
