import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToR2 } from '@/lib/s3';
import { getGoogleDriveConfig, getAccessToken } from '@/lib/google-drive';

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

    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media${authQuery}`, { headers });
    
    if (!driveRes.ok) {
       return NextResponse.json({ error: `Failed to download image from Drive` }, { status: 400 });
    }
    
    if (!process.env.R2_ACCESS_KEY_ID) {
      return NextResponse.json({ error: 'Missing R2_ACCESS_KEY_ID.' }, { status: 500 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `drive/${Date.now()}_${safeName}`;

    // Cloudflare R2 requires a buffer or Uint8Array
    const arrayBuffer = await driveRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudflare R2
    const url = await uploadToR2(
      filename, 
      buffer, 
      driveRes.headers.get('content-type') || 'application/octet-stream'
    );
    
    return NextResponse.json({ url }, { status: 200 });

  } catch (error: any) {
    console.error('Error in import-image route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
