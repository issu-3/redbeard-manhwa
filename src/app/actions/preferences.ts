'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveUserPreferences(preferences: Record<string, any>) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true },
    });

    const currentPreferences = (user?.preferences as Record<string, any>) || {};
    
    // Merge existing preferences with new ones
    const newPreferences = {
      ...currentPreferences,
      ...preferences,
    };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { preferences: newPreferences },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to save preferences:', error);
    return { success: false, error: 'Failed to save preferences' };
  }
}
