import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateVerificationToken } from '@/lib/tokens';
import { registerSchema } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // C3 FIX: Validate input using Zod schema
    const parsed = registerSchema.safeParse({
      email: body.email,
      username: body.name?.toLowerCase().replace(/\s+/g, '') || '',
      password: body.password,
      displayName: body.name,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstError?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password, displayName } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const username = (displayName || email.split('@')[0]).toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: displayName || undefined,
        username,
      },
    });

    const verificationToken = await generateVerificationToken(user.email);

    // C4 FIX: Only log verification link in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV MODE] Email verification link: http://localhost:3000/verify-email?token=${verificationToken.token}`);
    }
    // TODO: Send verification email in production using Resend/SendGrid

    return NextResponse.json(
      { message: 'User created successfully', id: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
