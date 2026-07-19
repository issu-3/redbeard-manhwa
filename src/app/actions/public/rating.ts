'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function submitRating(seriesId: string, score: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'You must be logged in to rate a series.' };
    }

    if (score < 1 || score > 5) {
      return { success: false, error: 'Rating must be between 1 and 5.' };
    }

    const userId = session.user.id;

    // Check if user already rated
    const existingRating = await prisma.rating.findFirst({
      where: { userId, seriesId },
    });

    if (existingRating) {
      await prisma.rating.update({
        where: { id: existingRating.id },
        data: { score },
      });
    } else {
      await prisma.rating.create({
        data: { userId, seriesId, score },
      });
    }

    // Calculate new average and count
    const aggregation = await prisma.rating.aggregate({
      where: { seriesId },
      _avg: { score: true },
      _count: { score: true },
    });

    const newAverage = aggregation._avg.score || 0;
    const newCount = aggregation._count.score || 0;

    // Update Series model with new stats
    await prisma.series.update({
      where: { id: seriesId },
      data: {
        averageRating: newAverage,
        ratingCount: newCount,
      },
    });

    // Revalidate paths that might show this series rating
    revalidatePath(`/series/[slug]`, 'page');
    revalidatePath('/'); // Homepage stats

    return { 
      success: true, 
      newAverage, 
      newCount 
    };
  } catch (error) {
    console.error('Error submitting rating:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
