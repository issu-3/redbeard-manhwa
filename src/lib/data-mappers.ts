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
  averageRating: number;
  ratingCount: number;
  totalViews: number;
  totalBookmarks: number;
  chapterCount: number;
  updatedAt: Date;
  genres: Array<{ name: string; slug: string }>;
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
} as const;

export function toSeriesCardData(series: SeriesCardInput | SeriesWithGenres): SeriesCardData {
  return {
    id: series.id,
    title: series.title,
    slug: series.slug,
    coverImage: series.coverImage || '',
    type: series.type as SeriesCardData['type'],
    status: series.status as SeriesCardData['status'],
    averageRating: series.averageRating,
    ratingCount: series.ratingCount,
    totalViews: series.totalViews,
    totalBookmarks: series.totalBookmarks,
    chapterCount: series.chapterCount,
    genres: series.genres.map((g) => ({ name: g.name, slug: g.slug })),
    updatedAt: series.updatedAt.toISOString(),
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
        publishedAt: c.publishedAt?.toISOString(),
        isRead: false,
        sourceType: c.sourceType || 'UPLOAD',
        downloadUrl: c.downloadUrl || undefined,
        downloadProvider: c.downloadProvider || undefined,
      })),
    createdAt: series.createdAt.toISOString(),
  };
}
