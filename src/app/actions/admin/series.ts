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

  const seoTitle = formData.get('seoTitle') as string;
  const seoDescription = formData.get('seoDescription') as string;
  const seoFocusKeyword = formData.get('seoFocusKeyword') as string;
  const seoKeywords = formData.get('seoKeywords') as string;
  const seoCanonicalUrl = formData.get('seoCanonicalUrl') as string;
  const seoRobots = formData.get('seoRobots') as string;
  const seoOgImage = formData.get('seoOgImage') as string;
  const seoTwitterImage = formData.get('seoTwitterImage') as string;

  const seo = {
    title: seoTitle || undefined,
    description: seoDescription || undefined,
    focusKeyword: seoFocusKeyword || undefined,
    keywords: seoKeywords || undefined,
    canonicalUrl: seoCanonicalUrl || undefined,
    robots: seoRobots || undefined,
    ogImage: seoOgImage || undefined,
    twitterImage: seoTwitterImage || undefined,
  };

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
      seo,
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

  const seoTitle = formData.get('seoTitle') as string;
  const seoDescription = formData.get('seoDescription') as string;
  const seoFocusKeyword = formData.get('seoFocusKeyword') as string;
  const seoKeywords = formData.get('seoKeywords') as string;
  const seoCanonicalUrl = formData.get('seoCanonicalUrl') as string;
  const seoRobots = formData.get('seoRobots') as string;
  const seoOgImage = formData.get('seoOgImage') as string;
  const seoTwitterImage = formData.get('seoTwitterImage') as string;

  const seo = {
    title: seoTitle || undefined,
    description: seoDescription || undefined,
    focusKeyword: seoFocusKeyword || undefined,
    keywords: seoKeywords || undefined,
    canonicalUrl: seoCanonicalUrl || undefined,
    robots: seoRobots || undefined,
    ogImage: seoOgImage || undefined,
    twitterImage: seoTwitterImage || undefined,
  };

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
      seo,
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
