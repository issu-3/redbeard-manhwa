import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This is a one-time script to fix the production database timestamps.
// It will copy 'createdAt' to 'publishedAt' for all chapters where 'publishedAt' is null.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await prisma.$executeRaw`UPDATE "Chapter" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL`;
    return NextResponse.json({
      success: true,
      message: 'Timestamps successfully fixed.',
      updatedCount: Number(result)
    });
  } catch (error: any) {
    console.error('Error fixing timestamps:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
