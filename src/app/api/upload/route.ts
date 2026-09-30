import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { uploadToR2 } from '@/lib/s3';

// C4 FIX: Allowed file types and max size
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    // C4 FIX: Auth check — only admin/moderator can upload
    const session = await auth();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized. Only admins can upload files.' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }

    // M5 FIX: Validate both MIME type and file extension to prevent spoofing
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
    
    const isAllowedMime = ALLOWED_TYPES.includes(file.type) || file.type === 'application/octet-stream' || !file.type;
    
    if (!isAllowedMime || !validExtensions.includes(extension)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed extensions: ${validExtensions.join(', ')}` },
        { status: 400 }
      );
    }

    // C4 FIX: Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }

    if (!process.env.R2_ACCESS_KEY_ID) {
      console.error('Missing R2_ACCESS_KEY_ID environment variable');
      return NextResponse.json(
        { error: 'Cloud storage is not configured. Missing R2 configuration.' },
        { status: 500 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const filename = `uploads/${Date.now()}_${safeName}`;

    // Cloud Storage via Cloudflare R2
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadToR2(filename, buffer, file.type || 'application/octet-stream');
    
    return NextResponse.json({ url }, { status: 200 });

  } catch (error) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { error: 'Internal Server Error during upload. Check server logs.' }, 
      { status: 500 }
    );
  }
}
