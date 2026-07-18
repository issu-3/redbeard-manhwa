'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

export async function getSettings() {
  const settings = await prisma.siteSetting.findMany();
  
  const settingsMap: Record<string, string> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }
  
  return settingsMap;
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
    return { success: false, error: error.message || 'Failed to save settings' };
  }
}
