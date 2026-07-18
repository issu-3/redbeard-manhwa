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

  const number = parseFloat(formData.get('number') as string);
  const title = formData.get('title') as string;
  const isPublished = formData.get('isPublished') === 'on' || formData.get('isPublished') === 'true';
  const imageUrlsText = formData.get('imageUrls') as string;

  const imageUrls = imageUrlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0);

  try {
    await prisma.chapter.create({
      data: {
        seriesId,
        number,
        title: title || undefined,
        slug: `chapter-${number}`,
        totalPages: imageUrls.length,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        images: {
          create: imageUrls.map((url, index) => ({
            pageNumber: index + 1,
            imageUrl: url
          }))
        }
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
      return { error: 'A chapter with this number already exists for this series.' };
    }
    throw error;
  }
  redirect(`/admin/series/${seriesId}/chapters`);
}

export async function updateChapter(chapterId: string, seriesId: string, formData: FormData) {
  await checkAdmin();

  const number = parseFloat(formData.get('number') as string);
  const title = formData.get('title') as string;
  const isPublished = formData.get('isPublished') === 'on' || formData.get('isPublished') === 'true';
  const imageUrlsText = formData.get('imageUrls') as string;

  const imageUrls = imageUrlsText.split('\n').map(url => url.trim()).filter(url => url.length > 0);

  try {
    await prisma.$transaction([
      prisma.chapterImage.deleteMany({ where: { chapterId } }),
      prisma.chapter.update({
        where: { id: chapterId },
        data: {
          number,
          title: title || undefined,
          slug: `chapter-${number}`,
          totalPages: imageUrls.length,
          isPublished,
          publishedAt: isPublished ? new Date() : null,
          images: {
            create: imageUrls.map((url, index) => ({
              pageNumber: index + 1,
              imageUrl: url
            }))
          }
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
      return { error: 'A chapter with this number already exists for this series.' };
    }
    throw error;
  }
  redirect(`/admin/series/${seriesId}/chapters`);
}
