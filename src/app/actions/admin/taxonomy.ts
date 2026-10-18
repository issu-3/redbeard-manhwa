'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { slugify } from '@/lib/utils';

export interface CreateTaxonomyResult {
  success: boolean;
  data?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized: Admin access required');
  }
}

export async function createGenreInline(name: string): Promise<CreateTaxonomyResult> {
  try {
    await checkAdmin();
  } catch {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.length < 2) {
    return { success: false, error: 'Genre name must be at least 2 characters long.' };
  }
  if (trimmed.length > 50) {
    return { success: false, error: 'Genre name cannot exceed 50 characters.' };
  }

  try {
    // Case-insensitive duplicate check
    const existing = await prisma.genre.findFirst({
      where: {
        name: {
          equals: trimmed,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return {
        success: false,
        error: `A genre named "${existing.name}" already exists.`,
        data: { id: existing.id, name: existing.name, slug: existing.slug }
      };
    }

    const slug = slugify(trimmed);
    if (!slug) {
      return { success: false, error: 'Invalid genre name provided.' };
    }

    const existingSlug = await prisma.genre.findUnique({
      where: { slug }
    });
    if (existingSlug) {
      return {
        success: false,
        error: `A genre with URL slug "${slug}" already exists (${existingSlug.name}).`
      };
    }

    const created = await prisma.genre.create({
      data: {
        name: trimmed,
        slug
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    revalidatePath('/admin/genres');
    revalidatePath('/admin/metadata');
    revalidatePath('/admin/series/new');
    revalidatePath('/search');
    revalidatePath('/browse/genres');

    return {
      success: true,
      data: created
    };
  } catch (error: any) {
    console.error('Error creating genre inline:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'A genre with this name or slug already exists.' };
    }
    return { success: false, error: error.message || 'Failed to create genre.' };
  }
}

export async function createTagInline(name: string): Promise<CreateTaxonomyResult> {
  try {
    await checkAdmin();
  } catch {
    return { success: false, error: 'Unauthorized: Admin access required.' };
  }

  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.length < 2) {
    return { success: false, error: 'Tag name must be at least 2 characters long.' };
  }
  if (trimmed.length > 50) {
    return { success: false, error: 'Tag name cannot exceed 50 characters.' };
  }

  try {
    // Case-insensitive duplicate check
    const existing = await prisma.tag.findFirst({
      where: {
        name: {
          equals: trimmed,
          mode: 'insensitive'
        }
      }
    });

    if (existing) {
      return {
        success: false,
        error: `A tag named "${existing.name}" already exists.`,
        data: { id: existing.id, name: existing.name, slug: existing.slug }
      };
    }

    const slug = slugify(trimmed);
    if (!slug) {
      return { success: false, error: 'Invalid tag name provided.' };
    }

    const existingSlug = await prisma.tag.findUnique({
      where: { slug }
    });
    if (existingSlug) {
      return {
        success: false,
        error: `A tag with URL slug "${slug}" already exists (${existingSlug.name}).`
      };
    }

    const created = await prisma.tag.create({
      data: {
        name: trimmed,
        slug
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    revalidatePath('/admin/tags');
    revalidatePath('/admin/metadata');
    revalidatePath('/admin/series/new');
    revalidatePath('/search');

    return {
      success: true,
      data: created
    };
  } catch (error: any) {
    console.error('Error creating tag inline:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'A tag with this name or slug already exists.' };
    }
    return { success: false, error: error.message || 'Failed to create tag.' };
  }
}

export async function createGenre(formData: FormData) {
  await checkAdmin();
  const name = formData.get('name') as string;
  const slug = (formData.get('slug') as string) || slugify(name);
  const description = formData.get('description') as string;
  const iconName = formData.get('iconName') as string;
  const color = formData.get('color') as string;

  await prisma.genre.create({
    data: {
      name,
      slug,
      description: description || null,
      iconName: iconName || null,
      color: color || null,
    }
  });

  revalidatePath('/admin/genres');
  revalidatePath('/search');
  revalidatePath('/browse/genres');
}

export async function updateGenre(formData: FormData) {
  await checkAdmin();
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const description = formData.get('description') as string;
  const iconName = formData.get('iconName') as string;
  const color = formData.get('color') as string;

  await prisma.genre.update({
    where: { id },
    data: {
      name,
      slug,
      description: description || null,
      iconName: iconName || null,
      color: color || null,
    }
  });

  revalidatePath('/admin/genres');
  revalidatePath('/search');
  revalidatePath('/browse/genres');
}

export async function deleteGenre(id: string) {
  await checkAdmin();
  await prisma.genre.delete({ where: { id } });
  revalidatePath('/admin/genres');
  revalidatePath('/search');
  revalidatePath('/browse/genres');
}

export async function createTag(formData: FormData) {
  await checkAdmin();
  const name = formData.get('name') as string;
  const slug = (formData.get('slug') as string) || slugify(name);

  await prisma.tag.create({
    data: { name, slug }
  });
  revalidatePath('/admin/tags');
}

export async function updateTag(formData: FormData) {
  await checkAdmin();
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;

  await prisma.tag.update({
    where: { id },
    data: { name, slug }
  });
  revalidatePath('/admin/tags');
}

export async function deleteTag(id: string) {
  await checkAdmin();
  await prisma.tag.delete({ where: { id } });
  revalidatePath('/admin/tags');
}
