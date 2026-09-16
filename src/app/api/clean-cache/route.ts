import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

export async function GET(req: Request) {
  const BAD_TEXT = 'REDESIGN AD PLACEMENT SYSTEM';
  const BAD_TEXT_2 = 'DOWNLOAD BASED ONLY';
  
  try {
    const settings = await prisma.siteSetting.findMany();
    let fixedCount = 0;
    
    for (const s of settings) {
      if (s.value.includes(BAD_TEXT) || s.value.includes(BAD_TEXT_2)) {
        let newValue = '';
        if (s.key === 'siteName') newValue = 'REDBEARD';
        if (s.key === 'seo_site_title') newValue = 'REDBEARD - The Ultimate Reading Experience';
        if (s.key === 'seo_site_description') newValue = 'Premium reading platform offering the best reading experience.';
        
        await prisma.siteSetting.update({
          where: { key: s.key },
          data: { value: newValue }
        });
        fixedCount++;
      }
    }

    // Clean other tables just to be sure
    const banners = await prisma.heroBanner.findMany();
    for (const b of banners) {
      if ((b.title && b.title.includes(BAD_TEXT)) || (b.subtitle && b.subtitle.includes(BAD_TEXT))) {
        await prisma.heroBanner.update({
          where: { id: b.id },
          data: { 
            title: b.title?.includes(BAD_TEXT) ? '' : b.title,
            subtitle: b.subtitle?.includes(BAD_TEXT) ? '' : b.subtitle
          }
        });
      }
    }

    const sections = await prisma.homepageSection.findMany();
    for (const s of sections) {
      if ((s.title && s.title.includes(BAD_TEXT)) || (s.subtitle && s.subtitle.includes(BAD_TEXT))) {
        await prisma.homepageSection.update({
          where: { id: s.id },
          data: { 
            title: s.title?.includes(BAD_TEXT) ? null : s.title,
            subtitle: s.subtitle?.includes(BAD_TEXT) ? null : s.subtitle
          }
        });
      }
    }
    
    // Clear the cache
    revalidateTag('settings');
    
    return NextResponse.json({ 
      success: true, 
      fixedCount,
      message: 'Cache invalidated and DB cleaned'
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
