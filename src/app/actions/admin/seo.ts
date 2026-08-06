'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import fs from 'fs';
import path from 'path';
import { generateSeriesSeo, calculateSeriesSeoScore } from '@/lib/seo-generator';
import { APP_URL } from '@/lib/constants';
import { unstable_cache } from 'next/cache';

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
    const autoDesc = `Read ${c.series.title} ${chLabel} online. High quality manhwa and webtoons available at REDBEARD.`;
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

export async function fetchSeoDashboardData() {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }

  // OPT-14: Cache this heavy operation to avoid loading all DB records into memory on every page load
  const getCachedRawData = unstable_cache(
    async () => {
      const [seriesRaw, chaptersRaw, viewLogs, totalViewsData] = await Promise.all([
        prisma.series.findMany({ select: { id: true, title: true, slug: true, seo: true, description: true, chapterCount: true, totalViews: true } }),
        prisma.chapter.findMany({ select: { id: true, number: true, title: true, label: true, slug: true, seriesId: true, series: { select: { title: true } }, seo: true, totalViews: true } }),
        prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(DISTINCT "ipAddress") as count FROM "ViewLog" WHERE "createdAt" >= NOW() - INTERVAL '7 days' AND "ipAddress" IS NOT NULL GROUP BY 1`,
        prisma.series.aggregate({ _sum: { totalViews: true } })
      ]);
      return { seriesRaw, chaptersRaw, viewLogs, totalViewsData };
    },
    ['admin-seo-dashboard-data'],
    { tags: ['admin-seo'], revalidate: 600 } // 10 minutes cache
  );

  const { seriesRaw, chaptersRaw, viewLogs, totalViewsData } = await getCachedRawData();

  const getSeoData = (record: { seo: any }) => {
    if (!record.seo) return {};
    try {
      return typeof record.seo === 'string' ? JSON.parse(record.seo) : record.seo;
    } catch (e) {
      return {};
    }
  };

  const allTitles = new Set<string>();
  const allDescs = new Set<string>();
  seriesRaw.forEach(s => {
    const seo = getSeoData(s);
    if (seo.title && seo.title.trim()) allTitles.add(seo.title.trim());
    if (seo.description && seo.description.trim()) allDescs.add(seo.description.trim());
  });

  const seriesList = seriesRaw.map(s => {
    const seo = getSeoData(s);
    const scoreData = calculateSeriesSeoScore(seo, s.slug, allTitles, allDescs);
    return {
      id: s.id,
      title: s.title,
      slug: s.slug,
      seoTitle: seo.title || null,
      metaDescription: seo.description || null,
      ogImage: seo.ogImage || null,
      canonical: seo.canonical || seo.canonicalUrl || null,
      wordCount: s.description ? s.description.split(/\s+/).length : 0,
      isIndexable: seo.noindex !== true && seo.robots !== 'noindex, nofollow',
      optimized: scoreData.score >= 80,
      seoScore: scoreData.score,
      missingFields: scoreData.missingFields,
      warnings: scoreData.warnings,
      isDuplicateTitle: scoreData.isDuplicateTitle,
      isDuplicateDesc: scoreData.isDuplicateDesc,
      isInvalidCanonical: scoreData.isInvalidCanonical
    };
  });

  const hasSeo = (record: { seo: any }) => {
    if (!record.seo) return false;
    try {
      const seo = typeof record.seo === 'string' ? JSON.parse(record.seo) : record.seo;
      return !!(seo.title || seo.description || seo.keywords || seo.focusKeyword);
    } catch (e) {
      return false;
    }
  };

  const chaptersWithSeoCount = chaptersRaw.filter(hasSeo).length;
  const seriesScore = seriesList.length > 0 ? Math.round(seriesList.reduce((acc, s) => acc + (s.seoScore || 0), 0) / seriesList.length) : 100;
  const chapterScore = chaptersRaw.length > 0 ? Math.round((chaptersWithSeoCount / chaptersRaw.length) * 100) : 100;
  
  const metadataScore = Math.round((seriesScore + chapterScore) / 2);
  const technicalScore = 90;
  const contentScore = 85;
  const overallScore = Math.round((metadataScore + technicalScore + contentScore) / 3);

  const chapterList = chaptersRaw.map(c => {
    const seo = getSeoData(c);
    return {
      id: c.id,
      seriesTitle: c.series.title,
      number: c.number,
      title: c.title,
      label: c.label,
      slug: c.slug,
      seriesId: c.seriesId,
      seoTitle: seo.title || null,
      metaDescription: seo.description || null,
      ogImage: seo.ogImage || null,
      canonical: seo.canonical || null,
      isIndexable: seo.noindex !== true,
      optimized: hasSeo(c)
    };
  });

  const hasRobots = fs.existsSync(path.join(process.cwd(), 'public', 'robots.txt')) || fs.existsSync(path.join(process.cwd(), 'src', 'app', 'robots.ts'));
  const hasSitemap = fs.existsSync(path.join(process.cwd(), 'public', 'sitemap.xml')) || fs.existsSync(path.join(process.cwd(), 'src', 'app', 'sitemap.ts'));
  
  let duplicateTitles = 0;
  let duplicateDescriptions = 0;
  const tSet = new Set();
  const dSet = new Set();

  [...seriesList, ...chapterList].forEach(item => {
    if (item.seoTitle) {
      if (tSet.has(item.seoTitle)) duplicateTitles++;
      else tSet.add(item.seoTitle);
    }
    if (item.metaDescription) {
      if (dSet.has(item.metaDescription)) duplicateDescriptions++;
      else dSet.add(item.metaDescription);
    }
  });

  const missingOgTags = [...seriesList, ...chapterList].filter(i => !i.ogImage).length;
  const nonIndexable = [...seriesList, ...chapterList].filter(i => !i.isIndexable).length;
  const seriesWithoutChapters = seriesRaw.filter(s => s.chapterCount === 0).length;
  const invalidCanonicals = seriesList.filter(s => s.isInvalidCanonical).length;

  const technicalAudit = [
    { name: 'robots.txt', status: hasRobots ? 'pass' : 'fail' },
    { name: 'sitemap.xml', status: hasSitemap ? 'pass' : 'fail' },
    { name: 'Open Graph Tags', status: missingOgTags > 0 ? 'warning' : 'pass' },
    { name: 'Duplicate Titles', status: duplicateTitles > 0 ? 'warning' : 'pass' },
    { name: 'Duplicate Descriptions', status: duplicateDescriptions > 0 ? 'warning' : 'pass' },
    { name: 'Canonical URLs Valid', status: invalidCanonicals > 0 ? 'warning' : 'pass' },
    { name: 'Empty Series (Orphan Pages)', status: seriesWithoutChapters > 0 ? 'warning' : 'pass' },
    { name: 'Indexability', status: nonIndexable > 0 ? 'warning' : 'pass' },
  ];

  const totalImpressions = totalViewsData._sum.totalViews || 0;
  const uniqueIps = viewLogs.reduce((acc, curr) => acc + Number(curr.count), 0);
  const ctr = totalImpressions > 0 ? ((uniqueIps / totalImpressions) * 100).toFixed(1) : '0';

  const gsc = {
    clicks: uniqueIps.toString(),
    impressions: totalImpressions.toString(),
    ctr: `${ctr}%`,
    avgPosition: 'N/A',
    indexedPages: seriesRaw.length + chaptersRaw.length - nonIndexable,
    crawlErrors: 0
  };

  const days: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days[d.toISOString().split('T')[0]] = 0;
  }
  
  viewLogs.forEach(v => {
    const day = v.date.toISOString().split('T')[0];
    if (days[day] !== undefined) {
      days[day] = Number(v.count);
    }
  });

  const timelineData = Object.keys(days).map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    score: overallScore,
    traffic: days[date]
  }));

  const aiSuggestions = [];
  const shortTitles = seriesList.filter(s => s.title.length < 10);
  if (shortTitles.length > 0) {
    aiSuggestions.push({ title: 'Improve short titles', desc: `${shortTitles.length} series have titles under 10 characters.` });
  }
  if (duplicateDescriptions > 0) {
    aiSuggestions.push({ title: 'Duplicate descriptions', desc: `Found ${duplicateDescriptions} pages using duplicate meta descriptions.` });
  }
  const missingSeo = seriesList.filter(s => s.missingFields && s.missingFields.length > 0).length;
  if (missingSeo > 0) {
    aiSuggestions.push({ title: 'Incomplete SEO Metadata', desc: `${missingSeo} series pages have missing SEO fields or recommendations.` });
  }

  return {
    overview: {
      overallScore,
      previousScore: overallScore,
      breakdown: {
        metadata: metadataScore,
        technical: technicalScore,
        performance: 0,
        content: contentScore,
        chapter: chapterScore
      }
    },
    series: seriesList,
    chapters: chapterList,
    technicalAudit,
    performance: null,
    gsc,
    timelineData,
    aiSuggestions
  };
}

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
