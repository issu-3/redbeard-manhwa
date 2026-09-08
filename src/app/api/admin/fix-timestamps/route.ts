import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

// This is a one-time script to fix the production database timestamps.
// It will copy 'createdAt' to 'publishedAt' for all chapters where 'publishedAt' is null.

export async function POST() {
  try {
    const session = await auth();
    
    // Explicit admin authorization check
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const result = await prisma.$executeRaw`UPDATE "Chapter" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL`;
    
    return NextResponse.json({
      success: true,
      message: 'Timestamps successfully fixed.',
      updatedCount: Number(result)
    });
  } catch (error: any) {
    // Only return safe error string instead of potentially leaking DB internals via error.message
    console.error('Error fixing timestamps:', error);
    return NextResponse.json({ success: false, error: 'Internal server error while fixing timestamps.' }, { status: 500 });
  }
}
