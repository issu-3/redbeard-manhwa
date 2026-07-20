import type { SeriesCardData, SeriesDetail } from '@/types';
import type { Series, Genre, Tag, Author, Artist, Chapter } from '@prisma/client';

type SeriesWithGenres = Series & { genres: Genre[] };
type FullSeries = Series & {
  genres: Genre[];
  tags: Tag[];
  authors: Author[];
  artists: Artist[];
  chapters: Chapter[];
};

export function toSeriesCardData(series: SeriesWithGenres): SeriesCardData {
  return {
    id: series.id,
    title: series.title,
    slug: series.slug,
    coverImage: series.coverImage,
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
      .sort((a, b) => b.number - a.number)
      .map((c) => ({
        id: c.id,
        number: c.number,
        title: c.title || undefined,
        slug: c.slug,
        totalPages: c.totalPages,
        totalViews: c.totalViews,
        publishedAt: c.publishedAt?.toISOString(),
        isRead: false,
      })),
    createdAt: series.createdAt.toISOString(),
  };
}
