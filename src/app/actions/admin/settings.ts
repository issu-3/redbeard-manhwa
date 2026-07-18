'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function getSettings() {
  try {
    const settings = await prisma.siteSetting.findMany();
    
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    
    return settingsMap;
  } catch (error: any) {
    console.error('Failed to fetch settings (table might not exist):', error.message);
    return {};
  }
}

export async function saveSettings(formData: FormData) {
  try {
    const session = await auth();
    if (!session || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' };
    }

    const updates = Array.from(formData.entries()).map(([key, value]) => ({
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
