'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function toggleBookmark(seriesId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('You must be logged in to bookmark a series');
  }

  const userId = session.user.id;

  const existingBookmark = await prisma.bookmark.findUnique({
    where: {
      userId_seriesId: {
        userId,
        seriesId,
      },
    },
  });

  if (existingBookmark) {
    // Remove bookmark
    await prisma.bookmark.delete({
      where: { id: existingBookmark.id },
    });
    // Decrement totalBookmarks on series
    await prisma.series.update({
      where: { id: seriesId },
      data: { totalBookmarks: { decrement: 1 } },
    });
    revalidatePath('/user/bookmarks');
    revalidatePath(`/series/[slug]`, 'page');
    return { bookmarked: false };
  } else {
    // Add bookmark
    await prisma.bookmark.create({
      data: {
        userId,
        seriesId,
      },
    });
    // Increment totalBookmarks on series
    await prisma.series.update({
      where: { id: seriesId },
      data: { totalBookmarks: { increment: 1 } },
    });
    revalidatePath('/user/bookmarks');
    revalidatePath(`/series/[slug]`, 'page');
    return { bookmarked: true };
  }
}
