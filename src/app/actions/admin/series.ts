'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { slugify } from '@/lib/utils';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }
}

export async function deleteSeries(id: string) {
  await checkAdmin();
  
  await prisma.series.delete({
    where: { id }
  });

  revalidatePath('/admin/series');
  revalidatePath('/browse/trending');
  revalidatePath('/browse/popular');
  revalidatePath('/');
  updateTag('homepage_data');
}

export async function createSeries(formData: FormData) {
  await checkAdmin();

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const synopsis = formData.get('synopsis') as string;
  const type = formData.get('type') as any;
  const status = formData.get('status') as any;
  const readingDirection = formData.get('readingDirection') as any;
  const coverImage = formData.get('coverImage') as string;
  const bannerImage = formData.get('bannerImage') as string;
  
  const genreIds = formData.getAll('genres') as string[];
  const tagIds = formData.getAll('tags') as string[];

  const slug = slugify(title);

  await prisma.series.create({
    data: {
      title,
      slug,
      description,
      synopsis,
      type,
      status,
      readingDirection,
      coverImage: coverImage || '/placeholder-cover.jpg',
      bannerImage: bannerImage || null,
      genres: {
        connect: genreIds.map(id => ({ id }))
      },
      tags: {
        connect: tagIds.map(id => ({ id }))
      }
    }
  });

  revalidatePath('/admin/series');
  updateTag('homepage_data');
  redirect('/admin/series');
}

export async function updateSeries(formData: FormData) {
  await checkAdmin();

  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const synopsis = formData.get('synopsis') as string;
  const type = formData.get('type') as any;
  const status = formData.get('status') as any;
  const readingDirection = formData.get('readingDirection') as any;
  const coverImage = formData.get('coverImage') as string;
  const bannerImage = formData.get('bannerImage') as string;
  
  const genreIds = formData.getAll('genres') as string[];
  const tagIds = formData.getAll('tags') as string[];

  const slug = slugify(title);

  await prisma.series.update({
    where: { id },
    data: {
      title,
      slug,
      description,
      synopsis,
      type,
      status,
      readingDirection,
      coverImage: coverImage || '/placeholder-cover.jpg',
      bannerImage: bannerImage || null,
      genres: {
        set: genreIds.map(genreId => ({ id: genreId }))
      },
      tags: {
        set: tagIds.map(tagId => ({ id: tagId }))
      }
    }
  });

  revalidatePath('/admin/series');
  revalidatePath(`/series/${slug}`);
  revalidatePath('/');
  updateTag('homepage_data');
  redirect('/admin/series');
}
