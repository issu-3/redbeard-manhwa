import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import fs from 'fs';
import path from 'path';
import { calculateSeriesSeoScore } from '@/lib/seo-generator';
import { APP_URL } from '@/lib/constants';
import { unstable_cache } from 'next/cache';

export async function fetchSeoDashboardData() {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) {
    throw new Error('Unauthorized');
  }

  // OPT-14: Cache this heavy operation to avoid loading all DB records into memory on every page load
  const getCachedRawData = unstable_cache(
    async () => {
      // ViewLog query is wrapped in try-catch because the table may not exist in all environments
      let viewLogsRaw: {date: Date, count: bigint}[] = [];
      try {
        viewLogsRaw = await prisma.$queryRaw<{date: Date, count: bigint}[]>`SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(DISTINCT "ipAddress") as count FROM "ViewLog" WHERE "createdAt" >= NOW() - INTERVAL '7 days' AND "ipAddress" IS NOT NULL GROUP BY 1`;
      } catch (e) {
        console.warn('ViewLog query failed (table may not exist):', (e as Error).message);
      }

      const [seriesRaw, chaptersRaw, totalViewsData] = await Promise.all([
        prisma.series.findMany({ select: { id: true, title: true, slug: true, seo: true, description: true, chapterCount: true, totalViews: true } }),
        prisma.chapter.findMany({ select: { id: true, number: true, title: true, label: true, slug: true, seriesId: true, series: { select: { title: true } }, seo: true, totalViews: true } }),
        prisma.series.aggregate({ _sum: { totalViews: true } })
      ]);
      // Convert bigint → number and Date → ISO string so the result is JSON-serializable for unstable_cache
      const viewLogs = viewLogsRaw.map(v => ({
        date: v.date instanceof Date ? v.date.toISOString() : String(v.date),
        count: Number(v.count),
      }));
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

  let hasRobots = false;
  let hasSitemap = false;
  try {
    hasRobots = fs.existsSync(path.join(process.cwd(), 'public', 'robots.txt')) || fs.existsSync(path.join(process.cwd(), 'src', 'app', 'robots.ts'));
    hasSitemap = fs.existsSync(path.join(process.cwd(), 'public', 'sitemap.xml')) || fs.existsSync(path.join(process.cwd(), 'src', 'app', 'sitemap.ts'));
  } catch {
    // fs operations may fail in some serverless environments
  }
  
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
    const day = typeof v.date === 'string' ? v.date.split('T')[0] : new Date(v.date).toISOString().split('T')[0];
    if (days[day] !== undefined) {
      days[day] = Number(v.count);
    }
  });

  const timelineData = Object.keys(days).map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    score: overallScore,
    traffic: days[date]
  }));

  const aiSuggestions: Array<{title: string, desc: string}> = [];
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
