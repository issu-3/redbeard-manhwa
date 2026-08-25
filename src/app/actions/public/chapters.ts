'use server';

import { prisma } from '@/lib/prisma';
import type { ChapterListItem } from '@/types';

export async function getSeriesChapters(seriesId: string, skip: number = 0, take: number = 100): Promise<ChapterListItem[]> {
  try {
    const chapters = await prisma.chapter.findMany({
      where: {
        seriesId,
        isPublished: true,
      },
      orderBy: [{ number: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
      select: {
        id: true,
        number: true,
        label: true,
        title: true,
        slug: true,
        totalPages: true,
        totalViews: true,
        publishedAt: true,
        sourceType: true,
        downloadUrl: true,
        downloadProvider: true,
      },
    });

    return chapters.map((c: any) => ({
      id: c.id,
      number: c.number,
      label: c.label || undefined,
      title: c.title || undefined,
      slug: c.slug,
      totalPages: c.totalPages,
      totalViews: c.totalViews,
      publishedAt: c.publishedAt?.toISOString(),
      sourceType: c.sourceType || 'UPLOAD',
      downloadUrl: c.downloadUrl || undefined,
      downloadProvider: c.downloadProvider || undefined,
      isRead: false
    })) as ChapterListItem[];
  } catch (error) {
    console.error('Failed to fetch chapters:', error);
    return [];
  }
}
