import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { put } from '@vercel/blob';
import { getGoogleDriveConfig, getAccessToken } from '@/lib/google-drive';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { fileId, fileName } = await req.json();
    if (!fileId || !fileName) {
      return NextResponse.json({ error: 'Missing fileId or fileName' }, { status: 400 });
    }

    const config = await getGoogleDriveConfig();
    let authHeader = '';

    if (config.enabled && config.credentials) {
      const token = await getAccessToken(config.credentials);
      authHeader = `Bearer ${token}`;
    } else if (process.env.GOOGLE_API_KEY) {
      authHeader = ``;
    } else {
      return NextResponse.json({ error: 'Google Drive not configured.' }, { status: 400 });
    }

    const authQuery = authHeader ? '' : `&key=${process.env.GOOGLE_API_KEY}`;
    const headers: Record<string, string> = authHeader ? { Authorization: authHeader } : {};

    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${authQuery}`, { headers });
    
    if (!driveRes.ok) {
       return NextResponse.json({ error: `Failed to download image from Drive` }, { status: 400 });
    }
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Missing BLOB_READ_WRITE_TOKEN.' }, { status: 500 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${Date.now()}_${safeName}`;

    // Upload the stream directly to Vercel Blob
    const blob = await put(filename, driveRes.body as any, { 
      access: 'public',
      contentType: driveRes.headers.get('content-type') || 'application/octet-stream'
    });
    
    return NextResponse.json({ url: blob.url }, { status: 200 });

  } catch (error: any) {
    console.error('Error in import-image route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
