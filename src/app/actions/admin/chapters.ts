'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }
}

export async function deleteChapter(chapterId: string, seriesId: string) {
  await checkAdmin();
  
  await prisma.chapter.delete({
    where: { id: chapterId }
  });

  await prisma.series.update({
    where: { id: seriesId },
    data: { chapterCount: { decrement: 1 } }
  });

  revalidatePath(`/admin/series/${seriesId}/chapters`);
  revalidatePath(`/series/[slug]`, 'page');
  revalidatePath(`/series/[slug]/chapter/[number]`, 'page');
  updateTag('homepage_data');
}

export async function createChapter(seriesId: string, formData: FormData) {
  await checkAdmin();

  const title = formData.get('title') as string;
  const isPublished = formData.get('isPublished') === 'on' || formData.get('isPublished') === 'true';
  const sourceType = (formData.get('sourceType') as string) || 'UPLOAD';
  
  // CBZ Upload logic
  const imageUrlsText = formData.get('imageUrls') as string;
  const imageUrls = imageUrlsText ? imageUrlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0) : [];

  // External logic
  const externalProvider = formData.get('externalProvider') as string;
  const externalUrl = formData.get('externalUrl') as string;
  let label = formData.get('label') as string | null;
  let numberStr = formData.get('number') as string;
  let number: number | null = numberStr ? parseFloat(numberStr) : null;
  
  if (sourceType === 'EXTERNAL') {
    number = null; // Enforce null number for external links
    if (!label) throw new Error('Chapter label is required for external links.');
  } else {
    label = null;
    if (number === null || isNaN(number)) {
      throw new Error('Chapter number is required and must be a valid number for sorting.');
    }
  }

  const slug = sourceType === 'EXTERNAL' ? `chapter-${label!.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `chapter-${number}`;

  try {
    await prisma.chapter.create({
      data: {
        seriesId,
        number,
        label,
        title: title || undefined,
        slug,
        totalPages: sourceType === 'EXTERNAL' ? 0 : imageUrls.length,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        sourceType,
        externalProvider: sourceType === 'EXTERNAL' ? externalProvider : null,
        externalUrl: sourceType === 'EXTERNAL' ? externalUrl : null,
        images: sourceType === 'UPLOAD' ? {
          create: imageUrls.map((url, index) => ({
            pageNumber: index + 1,
            imageUrl: url
          }))
        } : undefined
      }
    });

    const updateData: any = { chapterCount: { increment: 1 } };
    if (isPublished) updateData.updatedAt = new Date();

    await prisma.series.update({
      where: { id: seriesId },
      data: updateData
    });

    revalidatePath(`/admin/series/${seriesId}/chapters`);
    updateTag('homepage_data');
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'A chapter with this number already exists for this series.' };
    }
    throw error;
  }
  redirect(`/admin/series/${seriesId}/chapters`);
}

export async function updateChapter(chapterId: string, seriesId: string, formData: FormData) {
  await checkAdmin();

  const title = formData.get('title') as string;
  const isPublished = formData.get('isPublished') === 'on' || formData.get('isPublished') === 'true';
  const sourceType = (formData.get('sourceType') as string) || 'UPLOAD';
  
  // CBZ Upload logic
  const imageUrlsText = formData.get('imageUrls') as string;
  const imageUrls = imageUrlsText ? imageUrlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0) : [];

  // External logic
  const externalProvider = formData.get('externalProvider') as string;
  const externalUrl = formData.get('externalUrl') as string;
  let label = formData.get('label') as string | null;
  let numberStr = formData.get('number') as string;
  let number: number | null = numberStr ? parseFloat(numberStr) : null;
  
  if (sourceType === 'EXTERNAL') {
    number = null; // Enforce null number for external links
    if (!label) throw new Error('Chapter label is required for external links.');
  } else {
    label = null;
    if (number === null || isNaN(number)) {
      throw new Error('Chapter number is required and must be a valid number for sorting.');
    }
  }

  const slug = sourceType === 'EXTERNAL' ? `chapter-${label!.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `chapter-${number}`;

  try {
    await prisma.$transaction([
      prisma.chapterImage.deleteMany({ where: { chapterId } }),
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          number,
          label,
          title: title || undefined,
          slug,
          totalPages: sourceType === 'EXTERNAL' ? 0 : imageUrls.length,
          isPublished,
          publishedAt: isPublished ? new Date() : null,
          sourceType,
          externalProvider: sourceType === 'EXTERNAL' ? externalProvider : null,
          externalUrl: sourceType === 'EXTERNAL' ? externalUrl : null,
          images: sourceType === 'UPLOAD' && imageUrls.length > 0 ? {
            create: imageUrls.map((url, index) => ({
              pageNumber: index + 1,
              imageUrl: url
            }))
          } : undefined
        }
      })
    ]);

    if (isPublished) {
      await prisma.series.update({
        where: { id: seriesId },
        data: { updatedAt: new Date() }
      });
    }

    revalidatePath(`/admin/series/${seriesId}/chapters`);
    revalidatePath(`/series/[slug]`, 'page');
    revalidatePath(`/series/[slug]/chapter/[number]`, 'page');
    updateTag('homepage_data');
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'A chapter with this number already exists for this series.' };
    }
    throw error;
  }
  redirect(`/admin/series/${seriesId}/chapters`);
}
