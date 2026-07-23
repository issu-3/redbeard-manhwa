'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generatePasswordResetToken } from '@/lib/tokens';
import { sendResetEmail } from '@/lib/mail';

export async function forgotPassword(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return { success: true };
    }

    const resetToken = await generatePasswordResetToken(email);

    await sendResetEmail(email, resetToken.token);

    return { success: true };
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    return { success: false, error: 'Failed to process request.' };
  }
}

export async function resetPassword(token: string, newPassword: string) {
  try {
    const existingToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!existingToken || !existingToken.identifier.startsWith('reset:')) {
      return { success: false, error: 'Invalid or expired reset token.' };
    }

    if (new Date(existingToken.expires) < new Date()) {
      return { success: false, error: 'Token has expired.' };
    }

    const email = existingToken.identifier.replace('reset:', '');

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return { success: false, error: 'User does not exist.' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await prisma.verificationToken.delete({
      where: { id_token: { identifier: existingToken.identifier, token: existingToken.token } } as any // Prisma typed delete hack or use deleteMany
    }).catch(() => {
      // Fallback
      return prisma.verificationToken.deleteMany({
        where: { token: existingToken.token }
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Error in resetPassword:', error);
    return { success: false, error: 'Failed to reset password.' };
  }
}

export async function verifyEmail(token: string) {
  try {
    const existingToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!existingToken || existingToken.identifier.startsWith('reset:')) {
      return { success: false, error: 'Invalid or expired verification token.' };
    }

    if (new Date(existingToken.expires) < new Date()) {
      return { success: false, error: 'Token has expired.' };
    }

    const user = await prisma.user.findUnique({
      where: { email: existingToken.identifier }
    });

    if (!user) {
      return { success: false, error: 'User does not exist.' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        isVerified: true
      }
    });

    await prisma.verificationToken.deleteMany({
      where: { token: existingToken.token }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in verifyEmail:', error);
    return { success: false, error: 'Failed to verify email.' };
  }
}
