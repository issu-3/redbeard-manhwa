export interface SeriesCardData {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  type: 'MANHWA' | 'MANGA' | 'MANHUA' | 'WEBTOON';
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED' | 'UPCOMING';
  averageRating: number;
  totalViews: number;
  totalBookmarks: number;
  chapterCount: number;
  latestChapterNumber?: number;
  genres: { name: string; slug: string }[];
  updatedAt: string;
}

export interface SeriesDetail extends SeriesCardData {
  alternativeTitles: string[];
  description: string;
  synopsis?: string;
  bannerImage?: string;
  readingDirection: 'LTR' | 'RTL' | 'VERTICAL';
  releaseYear?: number;
  isHot: boolean;
  isFeatured: boolean;
  isEditorChoice: boolean;
  isHiddenGem: boolean;
  ratingCount: number;
  tags: { name: string; slug: string }[];
  authors: { name: string; slug: string }[];
  artists: { name: string; slug: string }[];
  chapters: ChapterListItem[];
  createdAt: string;
}

export interface ChapterListItem {
  id: string;
  number: number;
  title?: string;
  slug: string;
  totalPages: number;
  totalViews: number;
  publishedAt?: string;
  isRead?: boolean;
  sourceType?: string;
  externalUrl?: string;
  externalProvider?: string;
}

export interface ChapterData {
  id: string;
  seriesId: string;
  seriesTitle: string;
  seriesSlug: string;
  number: number;
  title?: string;
  slug: string;
  totalPages: number;
  sourceType?: string;
  externalUrl?: string;
  externalProvider?: string;
  images: ChapterImageData[];
  prevChapter?: { number: number; slug: string };
  nextChapter?: { number: number; slug: string };
}

export interface ChapterImageData {
  id: string;
  pageNumber: number;
  imageUrl: string;
  width?: number;
  height?: number;
  blurHash?: string;
}
