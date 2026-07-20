'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { auth } from '@/auth';


export async function saveSettings(formData: FormData) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const updates = Array.from(formData.entries())
      .filter(([key]) => !key.startsWith('$ACTION_ID') && !key.startsWith('ACTION_ID'))
      .map(([key, value]) => ({
        key,
        value: value.toString()
      }));

    // Perform upserts in a transaction
    await prisma.$transaction(
      updates.map(({ key, value }) => 
        prisma.siteSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value }
        })
      )
    );

    // @ts-expect-error - Next.js canary type expects 2 arguments for revalidateTag but at runtime works with 1
    revalidateTag('settings'); // IMPORTANT: Invalidates getCachedSettings cache
    revalidatePath('/', 'layout'); // Revalidate everything so new settings take effect
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save settings:', error);
    
    let errorMessage = error.message || 'Failed to save settings';
    
    // Check if the error is about a missing table (P2021)
    if (error.code === 'P2021' || errorMessage.includes('does not exist')) {
      errorMessage = 'The Settings table does not exist in the database. Please run "npx prisma db push" or deploy migrations to create it.';
    }
    
    return { success: false, error: errorMessage };
  }
}
