'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function clearReadingHistory() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to clear your history' };
  }

  try {
    await prisma.readingHistory.deleteMany({
      where: { userId: session.user.id },
    });
  } catch (error) {
    console.error('Failed to clear reading history:', error);
    return { success: false, error: 'Failed to clear history' };
  }

  revalidatePath('/user/history');
  return { success: true };
}

export async function removeHistoryItem(itemId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to remove history items' };
  }

  try {
    // deleteMany so ownership is enforced inside the query itself: a user can
    // only ever delete their own history rows.
    const { count } = await prisma.readingHistory.deleteMany({
      where: { id: itemId, userId: session.user.id },
    });

    if (count === 0) {
      return { success: false, error: 'Item not found' };
    }
  } catch (error) {
    console.error('Failed to remove history item:', error);
    return { success: false, error: 'Failed to remove item' };
  }

  revalidatePath('/user/history');
  return { success: true };
}
