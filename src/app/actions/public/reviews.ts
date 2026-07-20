'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function submitReview(
  seriesId: string,
  rating: number,
  content: string | null,
  isSpoiler: boolean
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  const userId = session.user.id;

  try {
    // Check if review already exists
    const existing = await prisma.review.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
    });

    if (existing) {
      await prisma.review.update({
        where: { id: existing.id },
        data: { rating, content, isSpoiler },
      });
    } else {
      await prisma.review.create({
        data: {
          userId,
          seriesId,
          rating,
          content,
          isSpoiler,
        },
      });
    }

    await updateSeriesRating(seriesId);

    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (series) {
      revalidatePath(`/series/${series.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to submit review:', error);
    return { success: false, error: 'Failed to submit review' };
  }
}

export async function deleteReview(reviewId: string, seriesId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review || review.userId !== session.user.id) {
      return { success: false, error: 'Unauthorized or review not found' };
    }

    await prisma.review.delete({ where: { id: reviewId } });
    await updateSeriesRating(seriesId);

    const series = await prisma.series.findUnique({ where: { id: seriesId } });
    if (series) {
      revalidatePath(`/series/${series.slug}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete review:', error);
    return { success: false, error: 'Failed to delete review' };
  }
}

async function updateSeriesRating(seriesId: string) {
  const reviews = await prisma.review.findMany({
    where: { seriesId },
    select: { rating: true },
  });

  const ratingCount = reviews.length;
  const averageRating =
    ratingCount > 0
      ? reviews.reduce((acc, curr) => acc + curr.rating, 0) / ratingCount
      : 0;

  await prisma.series.update({
    where: { id: seriesId },
    data: { ratingCount, averageRating },
  });
}
