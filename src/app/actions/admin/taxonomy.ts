'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }
}

export async function createGenre(formData: FormData) {
  await checkAdmin();
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
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
  const slug = formData.get('slug') as string;

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
