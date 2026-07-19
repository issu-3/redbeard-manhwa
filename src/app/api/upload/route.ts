import { NextRequest, NextResponse } from 'next/server';

import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('Missing BLOB_READ_WRITE_TOKEN environment variable');
      return NextResponse.json(
        { error: 'Cloud storage is not configured. Missing BLOB_READ_WRITE_TOKEN.' },
        { status: 500 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `${Date.now()}_${safeName}`;

    // Cloud Storage via Vercel Blob
    const blob = await put(filename, file, { access: 'public' });
    
    return NextResponse.json({ url: blob.url }, { status: 200 });

  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during upload. Check server logs.' }, 
      { status: 500 }
    );
  }
}
