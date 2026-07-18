'use strict';
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { slugify } from '@/lib/utils';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }
}

// ─── GENRES ─────────────────────────────────────────────────────────

export async function createGenre(formData: FormData) {
  await checkAdmin();
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string || slugify(name);
  const description = formData.get('description') as string | null;
  const iconName = formData.get('iconName') as string | null;
  const color = formData.get('color') as string | null;

  await prisma.genre.create({
    data: { name, slug, description, iconName, color },
  });
  revalidatePaths();
}

export async function updateGenre(id: string, formData: FormData) {
  await checkAdmin();
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string || slugify(name);
  const description = formData.get('description') as string | null;
  const iconName = formData.get('iconName') as string | null;
  const color = formData.get('color') as string | null;

  await prisma.genre.update({
    where: { id },
    data: { name, slug, description, iconName, color },
  });
  revalidatePaths();
}

export async function deleteGenre(id: string) {
  await checkAdmin();
  await prisma.genre.delete({ where: { id } });
  revalidatePaths();
}

// ─── TAGS ───────────────────────────────────────────────────────────

export async function createTag(formData: FormData) {
  await checkAdmin();
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string || slugify(name);

  await prisma.tag.create({
    data: { name, slug },
  });
  revalidatePaths();
}

export async function updateTag(id: string, formData: FormData) {
  await checkAdmin();
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string || slugify(name);

  await prisma.tag.update({
    where: { id },
    data: { name, slug },
  });
  revalidatePaths();
}

export async function deleteTag(id: string) {
  await checkAdmin();
  await prisma.tag.delete({ where: { id } });
  revalidatePaths();
}

function revalidatePaths() {
  revalidatePath('/admin/metadata');
  revalidatePath('/admin/series/new');
  revalidatePath('/');
  revalidatePath('/search');
  revalidatePath('/browse', 'layout');
}
