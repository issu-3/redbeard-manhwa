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
  revalidatePath(`/series/[slug]/chapter/[chapterSlug]`, 'page');
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
  const downloadProvider = formData.get('downloadProvider') as string;
  const downloadUrl = formData.get('downloadUrl') as string;
  let label = formData.get('label') as string | null;
  let numberStr = formData.get('number') as string;
  let number: number | null = numberStr ? parseFloat(numberStr) : null;
  
  if (sourceType === 'DOWNLOAD') {
    if (!label) return { error: 'Label is required for download links' };
    if (!downloadProvider) return { error: 'Download Provider is required' };
    if (!downloadUrl) return { error: 'Download URL is required' };
  } else {
    if (number === null || isNaN(number)) return { error: 'Valid chapter number is required' };
    if (!imageUrls || imageUrls.length === 0) return { error: 'At least one image is required for uploads' };
  }

  const slug = sourceType === 'DOWNLOAD' ? `chapter-${label!.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `chapter-${number}`;

  try {
    await prisma.chapter.create({
      data: {
        seriesId,
        number: sourceType === 'DOWNLOAD' ? null : number,
        title: title || null,
        label: label || null,
        slug,
        isPublished,
        totalPages: sourceType === 'DOWNLOAD' ? 0 : imageUrls.length,
        sourceType,
        seo: {},
        downloadProvider: sourceType === 'DOWNLOAD' ? downloadProvider : null,
        downloadUrl: sourceType === 'DOWNLOAD' ? downloadUrl : null,
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

export async function updateChapter(id: string, seriesId: string, formData: FormData) {
  await checkAdmin();

  const existing = await prisma.chapter.findUnique({ where: { id } });
  if (!existing) throw new Error('Chapter not found');

  const title = formData.get('title') as string;
  const isPublished = formData.get('isPublished') === 'on' || formData.get('isPublished') === 'true';
  const sourceType = (formData.get('sourceType') as string) || 'UPLOAD';
  
  // CBZ Upload logic
  const imageUrlsText = formData.get('imageUrls') as string;
  const imageUrls = imageUrlsText ? imageUrlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0) : [];

  // External logic
  const downloadProvider = formData.get('downloadProvider') as string;
  const downloadUrl = formData.get('downloadUrl') as string;
  let label = formData.get('label') as string | null;
  let numberStr = formData.get('number') as string;
  let number: number | null = numberStr ? parseFloat(numberStr) : null;
  
  if (sourceType === 'DOWNLOAD') {
    if (!label) return { error: 'Label is required for download links' };
    if (!downloadProvider) return { error: 'Download Provider is required' };
    if (!downloadUrl) return { error: 'Download URL is required' };
  } else {
    if (number === null || isNaN(number)) return { error: 'Valid chapter number is required' };
    if (!imageUrls || imageUrls.length === 0) return { error: 'At least one image is required for uploads' };
  }

  const slug = sourceType === 'DOWNLOAD' ? `chapter-${label!.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : `chapter-${number}`;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete existing images if we are updating an uploaded archive
      // Or if switching from UPLOAD to DOWNLOAD, clear old images
      if (sourceType === 'UPLOAD' || existing.sourceType === 'UPLOAD') {
        await tx.chapterImage.deleteMany({ where: { chapterId: id } });
      }

      // 2. Update chapter details
      await tx.chapter.update({
        where: { id },
        data: {
          number: sourceType === 'DOWNLOAD' ? null : number,
          title: title || null,
          label: label || null,
          slug,
          isPublished,
          totalPages: sourceType === 'DOWNLOAD' ? 0 : imageUrls.length,
          sourceType,
          downloadProvider: sourceType === 'DOWNLOAD' ? downloadProvider : null,
          downloadUrl: sourceType === 'DOWNLOAD' ? downloadUrl : null,
          images: sourceType === 'UPLOAD' && imageUrls.length > 0 ? {
            create: imageUrls.map((url, index) => ({
              pageNumber: index + 1,
              imageUrl: url
            }))
          } : undefined
        }
      });
    });

    if (isPublished) {
      await prisma.series.update({
        where: { id: seriesId },
        data: { updatedAt: new Date() }
      });
    }

    revalidatePath(`/admin/series/${seriesId}/chapters`);
    revalidatePath(`/series/[slug]`, 'page');
    revalidatePath(`/series/[slug]/chapter/[chapterSlug]`, 'page');
    updateTag('homepage_data');
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'A chapter with this number already exists for this series.' };
    }
    throw error;
  }
  redirect(`/admin/series/${seriesId}/chapters`);
}

export async function createBulkChapters(seriesId: string, chapters: { label: string; url: string; provider: string }[], isPublished: boolean = true) {
  await checkAdmin();

  if (!chapters || chapters.length === 0) return { error: 'No chapters provided' };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const createResult = await tx.chapter.createMany({
        data: chapters.map(ch => {
          const match = ch.label.match(/(\d+(\.\d+)?)/);
          const parsedNumber = match ? parseFloat(match[1]) : null;
          
          return {
            seriesId,
            number: parsedNumber,
            title: null,
            label: ch.label,
            slug: `chapter-${ch.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            isPublished: isPublished,
            totalPages: 0,
            sourceType: 'DOWNLOAD',
            downloadProvider: ch.provider,
            downloadUrl: ch.url,
            seo: {}
          };
        })
      });

      const updateData: any = { chapterCount: { increment: createResult.count } };
      if (isPublished) updateData.updatedAt = new Date();

      await tx.series.update({
        where: { id: seriesId },
        data: updateData
      });

      return createResult.count;
    });

    revalidatePath(`/admin/series/${seriesId}/chapters`);
    updateTag('homepage_data');
    
    return { success: true, count: created };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return { success: false, error: 'One or more chapters have duplicate slugs (labels).' };
    }
    throw error;
  }
}
