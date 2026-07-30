import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Simple security check so not anyone can run this
  if (secret !== 'pagla-admin-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const email = 'irshadansaripagla@gmail.com';
    const temporaryPassword = 'AdminPassword123!';
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const adminUser = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        passwordHash: passwordHash,
      },
      create: {
        email,
        username: 'admin',
        displayName: 'System Admin',
        passwordHash: passwordHash,
        role: 'ADMIN',
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin user seeded successfully!',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
