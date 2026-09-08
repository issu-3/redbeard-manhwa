'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

const DEFAULT_SECTIONS = [
  { type: 'HERO_BANNER', isActive: true, order: 0, limit: 10, isManual: false, title: null, subtitle: null, showViewAll: false },
  { type: 'POPULAR', isActive: true, order: 1, limit: 10, isManual: false, title: '🔥 Most Popular Series All Time', subtitle: 'Top-rated and most-read series on REDBEARD', showViewAll: true },
  { type: 'MANGA', isActive: true, order: 2, limit: 10, isManual: false, title: 'Manga', subtitle: 'Popular manga series', showViewAll: true },
  { type: 'MANHWA', isActive: true, order: 3, limit: 10, isManual: false, title: 'Manhwa', subtitle: 'Popular manhwa series', showViewAll: true },
  { type: 'RECENTLY_UPDATED', isActive: true, order: 4, limit: 10, isManual: false, title: '🆕 Recently Updated', subtitle: 'Fresh chapters just dropped', showViewAll: true },
  { type: 'NEW_RELEASES', isActive: true, order: 5, limit: 10, isManual: false, title: 'New Releases', subtitle: 'Fresh series and latest additions', showViewAll: true }
];

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
}

// ==========================================
// BANNERS
// ==========================================

export async function getBanners() {
  await checkAdmin();
  return prisma.heroBanner.findMany({ orderBy: { order: 'asc' } });
}

export async function upsertBanner(data: any) {
  await checkAdmin();
  const { id, ...rest } = data;
  
  if (id) {
    await prisma.heroBanner.update({ where: { id }, data: rest });
  } else {
    // get max order
    const max = await prisma.heroBanner.findFirst({ orderBy: { order: 'desc' } });
    await prisma.heroBanner.create({
      data: { ...rest, order: max ? max.order + 1 : 0 }
    });
  }
  
  revalidatePath('/', 'layout');
}

export async function deleteBanner(id: string) {
  await checkAdmin();
  await prisma.heroBanner.delete({ where: { id } });
  revalidatePath('/', 'layout');
}

export async function reorderBanners(orderedIds: string[]) {
  await checkAdmin();
  await prisma.$transaction(
    orderedIds.map((id, index) => 
      prisma.heroBanner.update({
        where: { id },
        data: { order: index }
      })
    )
  );
  revalidatePath('/', 'layout');
}

// ==========================================
// SECTIONS
// ==========================================

export async function getSections() {
  await checkAdmin();
  
  // Disable/Remove deprecated section types safely
  await prisma.homepageSection.deleteMany({
    where: { type: { in: ['TRENDING', 'RECOMMENDED', 'FEATURED'] } }
  });

  let sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  
  // Clean out any old unwanted sections safely if they somehow stuck around
  const hasOldSections = sections.some(s => ['LATEST', 'HERO'].includes(s.type));
  if (hasOldSections) {
    await prisma.homepageSection.deleteMany({
      where: { type: { in: ['LATEST', 'HERO'] } }
    });
    sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  }
  
  // Seed missing sections if they don't exist
  const missingSections = DEFAULT_SECTIONS.filter(d => !sections.some(s => s.type === d.type));
  if (missingSections.length > 0) {
    await prisma.homepageSection.createMany({ 
      data: missingSections.map(s => ({
        type: s.type,
        isActive: s.isActive,
        order: s.order,
        limit: s.limit,
        isManual: s.isManual,
        title: s.title,
        subtitle: s.subtitle,
        showViewAll: s.showViewAll,
        manualSeriesId: []
      }))
    });
    sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  }
  
  return sections;
}

export async function updateSection(id: string, data: any) {
  await checkAdmin();
  await prisma.homepageSection.update({
    where: { id },
    data
  });
  revalidatePath('/', 'layout');
}

export async function reorderSections(orderedIds: string[]) {
  await checkAdmin();
  await prisma.$transaction(
    orderedIds.map((id, index) => 
      prisma.homepageSection.update({
        where: { id },
        data: { order: index }
      })
    )
  );
  revalidatePath('/', 'layout');
}

// ==========================================
// SERIES / MANUAL SELECTIONS
// ==========================================

export async function searchSeries(query: string) {
  await checkAdmin();
  if (!query) return [];
  
  return prisma.series.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { alternativeTitles: { has: query } }
      ]
    },
    take: 10,
    select: { id: true, title: true, coverImage: true, status: true, type: true }
  });
}

export async function toggleSeriesFeatured(id: string, isFeatured: boolean) {
  await checkAdmin();
  await prisma.series.update({
    where: { id },
    data: { isFeatured }
  });
  revalidatePath('/', 'layout');
}

// Helper to get series by array of IDs (keeps order)
export async function getSeriesByIds(ids: string[]) {
  await checkAdmin();
  if (!ids.length) return [];
  
  const series = await prisma.series.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true, coverImage: true, status: true, type: true }
  });
  
  // Return in original id array order
  return ids.map(id => series.find(s => s.id === id)).filter(Boolean);
}

// ==========================================
// HOMEPAGE SETTINGS (Automation)
// ==========================================

export async function getHomepageSettings() {
  await checkAdmin();
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: ['homepage_auto_genres', 'homepage_cache_interval'] } }
  });
  
  const map = {
    homepage_auto_genres: 'true',
    homepage_cache_interval: '3600',
  };
  
  for (const s of settings) {
    if (s.key in map) (map as any)[s.key] = s.value;
  }
  return map;
}

export async function updateHomepageSettings(data: Record<string, string>) {
  await checkAdmin();
  await prisma.$transaction(
    Object.entries(data).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    )
  );
  revalidatePath('/', 'layout');
}

export async function refreshHomepageCache() {
  await checkAdmin();
  revalidatePath('/', 'layout');
  return { success: true, timestamp: new Date().toISOString() };
}

export async function getAutomatedSeries(type: string, limit: number) {
  await checkAdmin();
  
  if (type === 'MANGA' || type === 'MANHWA') {
    return prisma.series.findMany({ 
      where: { type },
      orderBy: [{ totalViews: 'desc' }, { createdAt: 'desc' }], 
      include: { genres: true }, 
      take: limit 
    });
  }
  else if (type === 'RECENTLY_UPDATED') {
    // For recently updated, we actually need to return chapters wrapped in a specific format for the preview.
    // However, the admin panel currently expects series. Let's return the series with the latest chapter included.
    const chapters = await prisma.chapter.findMany({
      where: { isPublished: true },
      orderBy: [
        { publishedAt: { sort: 'desc', nulls: 'last' } },
        { createdAt: 'desc' }
      ],
      take: limit * 2,
      include: { series: { include: { genres: true } } }
    });
    const unique = new Map();
    for (const ch of chapters) {
      if (!unique.has(ch.seriesId)) unique.set(ch.seriesId, ch);
    }
    return Array.from(unique.values()).slice(0, limit);
  }
  else if (type === 'NEW_RELEASES' || type === 'LATEST') {
    return prisma.series.findMany({ orderBy: { createdAt: 'desc' }, include: { genres: true }, take: limit });
  }
  return [];
}
