'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function toggleBookmark(seriesId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'You must be logged in to bookmark a series' };
  }

  const userId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingBookmark = await tx.bookmark.findUnique({
        where: {
          userId_seriesId: {
            userId,
            seriesId,
          },
        },
      });

      if (existingBookmark) {
        // Remove bookmark
        await tx.bookmark.delete({
          where: { id: existingBookmark.id },
        });
        // Decrement totalBookmarks on series
        await tx.series.update({
          where: { id: seriesId },
          data: { totalBookmarks: { decrement: 1 } },
        });
        return false;
      } else {
        // Add bookmark
        await tx.bookmark.create({
          data: {
            userId,
            seriesId,
          },
        });
        // Increment totalBookmarks on series
        await tx.series.update({
          where: { id: seriesId },
          data: { totalBookmarks: { increment: 1 } },
        });
        return true;
      }
    });

    revalidatePath('/user/bookmarks');
    revalidatePath(`/series/[slug]`, 'page');
    return { success: true, bookmarked: result };
  } catch (error) {
    console.error('Failed to toggle bookmark:', error);
    return { success: false, error: 'Failed to toggle bookmark' };
  }
}
