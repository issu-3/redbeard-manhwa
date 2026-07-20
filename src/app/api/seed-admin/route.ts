import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // C1 FIX: Block in production entirely
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  // Require a one-time seed secret
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  if (!secret || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Invalid or missing seed secret. Set SEED_SECRET env var and pass ?secret=<value>' }, { status: 403 });
  }

  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount > 0) {
      return NextResponse.json({ message: 'Admin already exists. Seed aborted.' }, { status: 400 });
    }

    const email = process.env.ADMIN_EMAIL || 'admin@redbeard.app';
    const temporaryPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        passwordHash,
      },
      create: {
        email,
        username: 'admin',
        displayName: 'System Admin',
        passwordHash,
        role: 'ADMIN',
      },
    });

    return NextResponse.json({
      message: 'Admin user seeded successfully!',
      email,
      instructions: 'Please log in and change your password immediately. Do NOT leave default credentials.',
      // NOTE: Password is NOT returned in the response
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      error: 'Failed to seed admin',
    }, { status: 500 });
  }
}
