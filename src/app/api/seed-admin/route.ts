import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    if (adminCount > 0) {
      return NextResponse.json({ message: 'Admin already exists. Seed aborted.' }, { status: 400 });
    }

    const email = 'irshadansaripagla@gmail.com';
    const temporaryPassword = 'AdminPassword123!';
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const adminUser = await prisma.user.upsert({
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
      email: adminUser.email,
      temporaryPassword,
      instructions: 'Please log in with these credentials and change your password immediately.',
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ 
      error: 'Failed to seed admin',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
