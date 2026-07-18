'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

const DEFAULT_SECTIONS = [
  { type: 'HERO', isActive: true, order: 0, limit: 10, isManual: false },
  { type: 'TRENDING', isActive: true, order: 1, limit: 10, isManual: false },
  { type: 'POPULAR', isActive: true, order: 2, limit: 10, isManual: false },
  { type: 'LATEST', isActive: true, order: 3, limit: 8, isManual: false },
  { type: 'NEW_RELEASES', isActive: true, order: 4, limit: 8, isManual: false },
  { type: 'FEATURED', isActive: true, order: 5, limit: 4, isManual: false },
  { type: 'COMPLETED', isActive: true, order: 6, limit: 6, isManual: false },
  { type: 'ONGOING', isActive: true, order: 7, limit: 6, isManual: false },
  { type: 'TOP_RATED', isActive: false, order: 8, limit: 6, isManual: false },
  { type: 'EDITORS_PICKS', isActive: true, order: 9, limit: 6, isManual: true },
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
  
  let sections = await prisma.homepageSection.findMany({ orderBy: { order: 'asc' } });
  
  // Seed if empty
  if (sections.length === 0) {
    await prisma.homepageSection.createMany({ data: DEFAULT_SECTIONS });
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

import { revalidateTag } from 'next/cache';

export async function refreshHomepageCache() {
  await checkAdmin();
  revalidateTag('homepage_data');
  return { success: true, timestamp: new Date().toISOString() };
}

export async function getAutomatedSeries(type: string, limit: number) {
  await checkAdmin();
  
  if (type === 'TRENDING') {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const topReads = await prisma.readingHistory.groupBy({
      by: ['seriesId'],
      where: { updatedAt: { gte: yesterday } },
      _count: { seriesId: true },
      orderBy: { _count: { seriesId: 'desc' } },
      take: limit
    });
    if (topReads.length > 0) {
      const seriesIds = topReads.map(t => t.seriesId);
      const foundSeries = await prisma.series.findMany({
        where: { id: { in: seriesIds } },
        select: { id: true, title: true, coverImage: true, status: true, type: true }
      });
      return seriesIds.map(id => foundSeries.find(s => s.id === id)).filter(Boolean);
    } else {
      return prisma.series.findMany({ orderBy: { totalViews: 'desc' }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
    }
  }
  else if (type === 'POPULAR') {
    return prisma.series.findMany({ orderBy: { totalViews: 'desc' }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
  }
  else if (type === 'LATEST') {
    return prisma.series.findMany({ orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
  }
  else if (type === 'NEW_RELEASES') {
    return prisma.series.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
  }
  else if (type === 'FEATURED') {
    return prisma.series.findMany({ where: { isFeatured: true }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
  }
  else if (type === 'COMPLETED') {
    return prisma.series.findMany({ where: { status: 'COMPLETED' }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
  }
  else if (type === 'ONGOING') {
    return prisma.series.findMany({ where: { status: 'ONGOING' }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
  }
  else if (type === 'TOP_RATED') {
    return prisma.series.findMany({ orderBy: { averageRating: 'desc' }, select: { id: true, title: true, coverImage: true, status: true, type: true }, take: limit });
  }
  return [];
}
