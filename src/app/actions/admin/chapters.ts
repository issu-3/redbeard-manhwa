'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
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

  revalidatePath(`/admin/series/${seriesId}/chapters`);
  revalidatePath(`/series/[slug]`, 'page');
  revalidatePath(`/series/[slug]/chapter/[number]`, 'page');
}

export async function createChapter(seriesId: string, formData: FormData) {
  await checkAdmin();

  const number = parseFloat(formData.get('number') as string);
  const title = formData.get('title') as string;
  const isPublished = formData.get('isPublished') === 'on';
  const imageUrlsText = formData.get('imageUrls') as string;

  const imageUrls = imageUrlsText.split('\\n').map(url => url.trim()).filter(url => url.length > 0);

  const chapter = await prisma.chapter.create({
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

  revalidatePath(`/admin/series/${seriesId}/chapters`);
  redirect(`/admin/series/${seriesId}/chapters`);
}
