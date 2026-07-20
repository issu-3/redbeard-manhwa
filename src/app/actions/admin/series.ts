'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { slugify } from '@/lib/utils';
import { seriesSchema } from '@/lib/validators';

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

  // H9 FIX: Parse form data with seriesSchema instead of `as any`
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    synopsis: formData.get('synopsis') as string || undefined,
    type: formData.get('type') as string,
    status: formData.get('status') as string,
    readingDirection: formData.get('readingDirection') as string || undefined,
    coverImage: formData.get('coverImage') as string || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    bannerImage: formData.get('bannerImage') as string || undefined,
    genreIds: formData.getAll('genres') as string[],
    tagIds: formData.getAll('tags') as string[],
  };

  const parsed = seriesSchema.safeParse(rawData);
  
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid form data');
  }

  const {
    title, description, synopsis, type, status, readingDirection,
    coverImage, bannerImage, genreIds, tagIds
  } = parsed.data;

  const slug = slugify(title);

  const seo = {
    title: (formData.get('seoTitle') as string) || undefined,
    description: (formData.get('seoDescription') as string) || undefined,
    focusKeyword: (formData.get('seoFocusKeyword') as string) || undefined,
    keywords: (formData.get('seoKeywords') as string) || undefined,
    canonicalUrl: (formData.get('seoCanonicalUrl') as string) || undefined,
    robots: (formData.get('seoRobots') as string) || undefined,
    ogImage: (formData.get('seoOgImage') as string) || undefined,
    twitterImage: (formData.get('seoTwitterImage') as string) || undefined,
  };

  // C5 FIX: Wrap in try/catch for proper error handling
  try {
    await prisma.series.create({
      data: {
        title,
        slug,
        description,
        synopsis,
        type,
        status,
        readingDirection,
        coverImage: coverImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
        bannerImage: bannerImage || null,
        seo,
        genres: {
          connect: genreIds.map(id => ({ id }))
        },
        tags: {
          connect: (tagIds || []).map(id => ({ id }))
        }
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error(`A series with the slug "${slug}" already exists. Please use a different title.`);
    }
    console.error('Failed to create series:', error);
    throw new Error('Failed to create series. Please try again.');
  }

  revalidatePath('/admin/series');
  updateTag('homepage_data');
  redirect('/admin/series');
}

export async function updateSeries(formData: FormData) {
  await checkAdmin();

  const id = formData.get('id') as string;

  // H9 FIX: Parse form data with seriesSchema instead of `as any`
  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    synopsis: formData.get('synopsis') as string || undefined,
    type: formData.get('type') as string,
    status: formData.get('status') as string,
    readingDirection: formData.get('readingDirection') as string || undefined,
    coverImage: formData.get('coverImage') as string || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
    bannerImage: formData.get('bannerImage') as string || undefined,
    genreIds: formData.getAll('genres') as string[],
    tagIds: formData.getAll('tags') as string[],
  };

  const parsed = seriesSchema.safeParse(rawData);
  
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || 'Invalid form data');
  }

  const {
    title, description, synopsis, type, status, readingDirection,
    coverImage, bannerImage, genreIds, tagIds
  } = parsed.data;

  const slug = slugify(title);

  const seo = {
    title: (formData.get('seoTitle') as string) || undefined,
    description: (formData.get('seoDescription') as string) || undefined,
    focusKeyword: (formData.get('seoFocusKeyword') as string) || undefined,
    keywords: (formData.get('seoKeywords') as string) || undefined,
    canonicalUrl: (formData.get('seoCanonicalUrl') as string) || undefined,
    robots: (formData.get('seoRobots') as string) || undefined,
    ogImage: (formData.get('seoOgImage') as string) || undefined,
    twitterImage: (formData.get('seoTwitterImage') as string) || undefined,
  };

  // C5 FIX: Wrap in try/catch for proper error handling
  try {
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
        coverImage: coverImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
        bannerImage: bannerImage || null,
        seo,
        genres: {
          set: genreIds.map(genreId => ({ id: genreId }))
        },
        tags: {
          set: (tagIds || []).map(tagId => ({ id: tagId }))
        }
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error(`A series with the slug "${slug}" already exists. Please use a different title.`);
    }
    console.error('Failed to update series:', error);
    throw new Error('Failed to update series. Please try again.');
  }

  revalidatePath('/admin/series');
  revalidatePath(`/series/${slug}`);
  revalidatePath('/');
  updateTag('homepage_data');
  redirect('/admin/series');
}
