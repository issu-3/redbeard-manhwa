'use server';

import { revalidateTag, revalidatePath } from 'next/cache';
import { fetchSeoDashboardData } from './seo-data';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function runSeoAudit() {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) throw new Error('Unauthorized');

  // @ts-expect-error - Next.js canary type expects 2 arguments
  revalidateTag('admin-seo');
  
  const newData = await fetchSeoDashboardData();
  return { success: true, message: `SEO Audit completed. Calculated score: ${newData.overview.overallScore}/100.` };
}

export async function regenerateSitemap() {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) throw new Error('Unauthorized');

  // Next.js uses revalidatePath for file-based route caching
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemap-[id].xml');
  
  // @ts-expect-error - Next.js canary type expects 2 arguments
  revalidateTag('admin-seo');
  
  return { success: true, message: 'Sitemap regeneration triggered and caches invalidated.' };
}

export async function validateStructuredData() {
  const session = await auth();
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MODERATOR')) throw new Error('Unauthorized');

  const seriesList = await prisma.series.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      coverImage: true,
      genres: { select: { id: true } },
      authors: { select: { id: true } }
    }
  });

  let validCount = 0;
  let missingCount = 0;
  let invalidCount = 0;
  const errors: string[] = [];

  seriesList.forEach(s => {
    const missingProps = [];
    if (!s.title) missingProps.push('name');
    if (!s.description) missingProps.push('description');
    if (!s.coverImage) missingProps.push('image');
    if (s.genres.length === 0) missingProps.push('genre');
    if (s.authors.length === 0) missingProps.push('author');

    if (missingProps.length === 0) {
      validCount++;
    } else if (missingProps.length === 5) {
      missingCount++;
    } else {
      invalidCount++;
      if (errors.length < 5) {
        errors.push(`"${s.title || s.id}" missing: ${missingProps.join(', ')}`);
      }
    }
  });

  const msg = `Checked ${seriesList.length} records. Valid ComicSeries/Book Schema: ${validCount}. Invalid: ${invalidCount}.`;
  return { success: true, message: msg };
}

export async function exportSeoReport() {
  const data = await fetchSeoDashboardData();
  
  const header = 'Series ID,Title,Slug,SEO Score,Optimized,Indexable,Missing Fields,Warnings\n';
  const rows = data.series.map(s => {
    return `${s.id},"${s.title.replace(/"/g, '""')}",${s.slug},${s.seoScore},${s.optimized},${s.isIndexable},"${(s.missingFields || []).join(', ')}","${(s.warnings || []).join(', ').replace(/"/g, '""')}"`;
  }).join('\n');
  
  const csv = header + rows;
  return { success: true, data: csv, filename: `seo-report-${new Date().toISOString().split('T')[0]}.csv` };
}
