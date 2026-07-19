import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function generateVerificationToken(email: string) {
  const token = crypto.randomUUID();
  const expires = new Date(new Date().getTime() + 1000 * 60 * 60 * 24); // 24 hours

  // Delete existing token if exists
  await prisma.verificationToken.deleteMany({
    where: { identifier: email }
  });

  const verificationToken = await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires
    }
  });

  return verificationToken;
}

export async function generatePasswordResetToken(email: string) {
  const token = crypto.randomUUID();
  const expires = new Date(new Date().getTime() + 1000 * 60 * 60); // 1 hour
  const identifier = `reset:${email}`;

  // Delete existing token if exists
  await prisma.verificationToken.deleteMany({
    where: { identifier }
  });

  const resetToken = await prisma.verificationToken.create({
    data: {
      identifier,
      token,
      expires
    }
  });

  return resetToken;
}
