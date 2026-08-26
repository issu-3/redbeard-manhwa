'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { generateSeriesSeo } from '@/lib/seo-generator';
import { APP_URL } from '@/lib/constants';

export async function generateMissingSeoData(forceRegenerate: boolean = false) {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }

  const series = await prisma.series.findMany({ 
    select: { 
      id: true, 
      title: true, 
      synopsis: true, 
      description: true, 
      slug: true, 
      coverImage: true, 
      bannerImage: true, 
      seo: true, 
      genres: { select: { name: true } }, 
      tags: { select: { name: true } } 
    } 
  });
  
  const chapters = await prisma.chapter.findMany({ 
    select: { 
      id: true, 
      title: true, 
      number: true, 
      slug: true, 
      seo: true, 
      series: { select: { title: true, slug: true, coverImage: true, bannerImage: true } } 
    }
  });

  let titlesGenerated = 0;
  let descriptionsGenerated = 0;
  let keywordsGenerated = 0;
  let canonicalsGenerated = 0;
  let socialImagesAssigned = 0;
  let totalUpdated = 0;

  for (const s of series) {
    const existingSeo = typeof s.seo === 'string' ? (tryParseJson(s.seo) || {}) : (s.seo || {});
    
    const hadTitle = !!(existingSeo.title && existingSeo.title.trim());
    const hadDesc = !!(existingSeo.description && existingSeo.description.trim());
    const hadKw = !!(existingSeo.keywords && existingSeo.keywords.trim());
    const hadCan = !!(existingSeo.canonical || existingSeo.canonicalUrl);
    const hadImg = !!(existingSeo.ogImage || existingSeo.twitterImage);

    const newSeo = generateSeriesSeo({
      title: s.title,
      slug: s.slug,
      synopsis: s.synopsis,
      description: s.description,
      coverImage: s.coverImage,
      bannerImage: s.bannerImage,
      genres: s.genres.map(g => g.name),
      tags: s.tags.map(t => t.name)
    }, existingSeo, forceRegenerate);

    const changed = forceRegenerate || JSON.stringify(existingSeo) !== JSON.stringify(newSeo);
    
    if (changed) {
      if (!hadTitle || forceRegenerate) titlesGenerated++;
      if (!hadDesc || forceRegenerate) descriptionsGenerated++;
      if (!hadKw || forceRegenerate) keywordsGenerated++;
      if (!hadCan || forceRegenerate) canonicalsGenerated++;
      if (!hadImg || forceRegenerate) socialImagesAssigned++;

      try {
        await prisma.series.update({
          where: { id: s.id },
          data: { seo: newSeo }
        });
        totalUpdated++;
      } catch (err) {
        console.error(`Failed to update SEO for series ${s.id}`, err);
      }
    }
  }

  for (const c of chapters) {
    const existingSeo = typeof c.seo === 'string' ? (tryParseJson(c.seo) || {}) : (c.seo || {});
    
    const hadTitle = !!(existingSeo.title && existingSeo.title.trim());
    const hadDesc = !!(existingSeo.description && existingSeo.description.trim());
    const hadCan = !!(existingSeo.canonical || existingSeo.canonicalUrl);
    const hadImg = !!(existingSeo.ogImage || existingSeo.twitterImage);

    const chLabel = c.number !== null ? `Chapter ${c.number}` : (c.title || c.slug || 'Latest Chapter');
    const autoTitle = `${c.series.title} - ${chLabel} | REDBEARD`;
    const autoDesc = `Read ${c.series.title} ${chLabel} online. High quality series available at REDBEARD.`;
    const baseUrl = APP_URL.startsWith('http') ? APP_URL : 'https://redbeard-manhwa.vercel.app';
    const autoCanonical = `${baseUrl}/series/${c.series.slug}/chapter/${c.slug}`;
    const autoImg = existingSeo.ogImage || c.series.bannerImage || c.series.coverImage || '/images/og-default.png';

    const newTitle = (!forceRegenerate && existingSeo.title && existingSeo.title.trim()) ? existingSeo.title.trim() : autoTitle;
    const newDesc = (!forceRegenerate && existingSeo.description && existingSeo.description.trim()) ? existingSeo.description.trim() : autoDesc;
    const newCanonical = (!forceRegenerate && (existingSeo.canonical || existingSeo.canonicalUrl)) ? (existingSeo.canonical || existingSeo.canonicalUrl) : autoCanonical;
    const newImg = (!forceRegenerate && existingSeo.ogImage) ? existingSeo.ogImage : autoImg;

    const newSeo = {
      ...existingSeo,
      title: newTitle,
      description: newDesc,
      canonical: newCanonical,
      canonicalUrl: newCanonical,
      ogImage: newImg,
      twitterImage: existingSeo.twitterImage || newImg,
      robots: existingSeo.robots || 'index, follow'
    };

    const changed = forceRegenerate || JSON.stringify(existingSeo) !== JSON.stringify(newSeo);
    if (changed) {
      if (!hadTitle || forceRegenerate) titlesGenerated++;
      if (!hadDesc || forceRegenerate) descriptionsGenerated++;
      if (!hadCan || forceRegenerate) canonicalsGenerated++;
      if (!hadImg || forceRegenerate) socialImagesAssigned++;

      try {
        await prisma.chapter.update({
          where: { id: c.id },
          data: { seo: newSeo }
        });
        totalUpdated++;
      } catch (err) {
        console.error(`Failed to update SEO for chapter ${c.id}`, err);
      }
    }
  }

  return { 
    success: true, 
    message: forceRegenerate 
      ? `Force regenerated SEO metadata for ${totalUpdated} items.` 
      : `Auto-filled empty SEO fields for ${totalUpdated} items without overwriting manual values.`,
    summary: {
      titlesGenerated,
      descriptionsGenerated,
      keywordsGenerated,
      canonicalsGenerated,
      socialImagesAssigned,
      totalUpdated
    }
  };
}

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
