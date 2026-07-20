'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAdminReviews(page = 1, pageSize = 20) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }

  const skip = (page - 1) * pageSize;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
        series: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.review.count(),
  ]);

  return {
    reviews,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function adminDeleteReview(reviewId: string) {
  const session = await auth();
  if (session?.user?.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { seriesId: true },
    });

    if (!review) {
      return { success: false, error: 'Review not found' };
    }

    await prisma.review.delete({ where: { id: reviewId } });
    
    // Recalculate average rating for the series
    const remainingReviews = await prisma.review.findMany({
      where: { seriesId: review.seriesId },
      select: { rating: true },
    });

    const ratingCount = remainingReviews.length;
    const averageRating =
      ratingCount > 0
        ? remainingReviews.reduce((acc, curr) => acc + curr.rating, 0) / ratingCount
        : 0;

    const series = await prisma.series.update({
      where: { id: review.seriesId },
      data: { ratingCount, averageRating },
    });

    revalidatePath(`/series/${series.slug}`);
    revalidatePath('/admin/reviews');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete review as admin:', error);
    return { success: false, error: 'Failed to delete review' };
  }
}
