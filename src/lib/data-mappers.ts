import type { SeriesCardData, SeriesDetail } from '@/types';
import type { Series, Genre, Tag, Author, Artist, Chapter } from '@prisma/client';

type SeriesWithGenres = Series & { genres: Genre[] };
type SeriesCardInput = {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  type: string;
  status: string;
  isNSFW: boolean;
  averageRating: number;
  ratingCount: number;
  totalViews: number;
  totalBookmarks: number;
  chapterCount: number;
  updatedAt: Date;
  genres: Array<{ name: string; slug: string }>;
  chapters?: Array<{ number: number | null }>;
};
type FullSeries = Series & {
  genres: Genre[];
  tags: Tag[];
  authors: Author[];
  artists: Artist[];
  chapters: Chapter[];
};

export const SERIES_CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  coverImage: true,
  type: true,
  status: true,
  isNSFW: true,
  averageRating: true,
  ratingCount: true,
  totalViews: true,
  totalBookmarks: true,
  chapterCount: true,
  updatedAt: true,
  genres: {
    select: {
      name: true,
      slug: true,
    },
  },
  // Latest published chapter, used for latestChapterNumber on cards.
  // chapterCount is only a row count: decimal chapters (24.5) and numbering
  // gaps make it differ from the latest chapter's number, so cards must not
  // render chapterCount as "Chapter N".
  chapters: {
    where: { isPublished: true, number: { not: null } },
    orderBy: { number: 'desc' },
    take: 1,
    select: { number: true },
  },
} as const;

function toIsoString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  try {
    return new Date(val).toISOString();
  } catch {
    return String(val);
  }
}

function toOptionalIsoString(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'string') return val;
  if (val instanceof Date) return val.toISOString();
  try {
    return new Date(val).toISOString();
  } catch {
    return undefined;
  }
}

export function toSeriesCardData(series: SeriesCardInput | SeriesWithGenres | any): SeriesCardData {
  return {
    id: series.id,
    title: series.title,
    slug: series.slug,
    coverImage: series.coverImage || '',
    type: series.type as SeriesCardData['type'],
    status: series.status as SeriesCardData['status'],
    isNSFW: series.isNSFW,
    averageRating: series.averageRating,
    ratingCount: series.ratingCount,
    totalViews: series.totalViews,
    totalBookmarks: series.totalBookmarks,
    chapterCount: series.chapterCount,
    latestChapterNumber: series.chapters?.[0]?.number ?? undefined,
    genres: series.genres.map((g: any) => ({ name: g.name, slug: g.slug })),
    updatedAt: toIsoString(series.updatedAt),
  };
}

export function toSeriesDetail(series: FullSeries): SeriesDetail {
  return {
    ...toSeriesCardData(series),
    alternativeTitles: series.alternativeTitles,
    description: series.description,
    synopsis: series.synopsis || undefined,
    bannerImage: series.bannerImage || undefined,
    readingDirection: series.readingDirection as SeriesDetail['readingDirection'],
    releaseYear: series.releaseYear || undefined,
    isHot: series.isHot,
    isFeatured: series.isFeatured,
    isEditorChoice: series.isEditorChoice,
    isHiddenGem: series.isHiddenGem,
    tags: series.tags.map((t) => ({ name: t.name, slug: t.slug })),
    authors: series.authors.map((a) => ({ name: a.name, slug: a.slug })),
    artists: series.artists.map((a) => ({ name: a.name, slug: a.slug })),
    chapters: series.chapters
      .sort((a, b) => (b.number ?? 0) - (a.number ?? 0))
      .map((c) => ({
        id: c.id,
        number: c.number,
        label: c.label || undefined,
        title: c.title || undefined,
        slug: c.slug,
        totalPages: c.totalPages,
        totalViews: c.totalViews,
        publishedAt: toOptionalIsoString(c.publishedAt),
        isRead: false,
        sourceType: c.sourceType || 'UPLOAD',
        downloadUrl: c.downloadUrl || undefined,
        downloadProvider: c.downloadProvider || undefined,
      })),
    createdAt: toIsoString(series.createdAt),
  };
}
