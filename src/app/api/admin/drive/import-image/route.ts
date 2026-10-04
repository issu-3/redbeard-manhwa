import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
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

    // We no longer download and upload to R2 during import.
    // Instead, we return a stable gdrive: reference so Google Drive remains the MASTER source.
    // The reader API will lazily cache this to R2 on the first read.
    const url = `gdrive:${fileId}`;
    
    return NextResponse.json({ url }, { status: 200 });

  } catch (error: any) {
    console.error('Error in import-image route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
