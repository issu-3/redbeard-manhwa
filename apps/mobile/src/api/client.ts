import { API_BASE_URL } from './config';

export interface SeriesCardData {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
  type: string;
  status: string;
  isNSFW: boolean;
  averageRating: number;
  ratingCount: number;
  totalViews: number;
  totalBookmarks: number;
  chapterCount: number;
  updatedAt: string;
  genres: { name: string; slug: string }[];
}

export interface Chapter {
  id: string;
  number: number | null;
  label?: string;
  title?: string;
  slug: string;
  totalPages: number;
  totalViews: number;
  publishedAt?: string;
  isRead: boolean;
  sourceType: string;
  downloadUrl?: string;
  downloadProvider?: string;
}

export interface SeriesDetail extends SeriesCardData {
  alternativeTitles: string[];
  description: string;
  synopsis?: string;
  bannerImage?: string;
  readingDirection: string;
  releaseYear?: number;
  isHot: boolean;
  isFeatured: boolean;
  isEditorChoice: boolean;
  isHiddenGem: boolean;
  tags: { name: string; slug: string }[];
  authors: { name: string; slug: string }[];
  artists: { name: string; slug: string }[];
  chapters: Chapter[];
  createdAt: string;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export const ApiClient = {
  async getGenres(): Promise<Genre[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/genres`);
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (e) {
      console.warn('Failed to fetch genres', e);
      return [];
    }
  },

  async searchSeries(params: {
    q?: string;
    genre?: string[];
    type?: string;
    status?: string;
    sort?: string;
    limit?: number;
    skip?: number;
  }): Promise<SeriesCardData[]> {
    try {
      const url = new URL(`${API_BASE_URL}/api/search`);
      if (params.q) url.searchParams.set('q', params.q);
      if (params.genre) {
        params.genre.forEach(g => url.searchParams.append('genre', g));
      }
      if (params.type) url.searchParams.set('type', params.type);
      if (params.status) url.searchParams.set('status', params.status);
      if (params.sort) url.searchParams.set('sort', params.sort);
      if (params.limit) url.searchParams.set('limit', params.limit.toString());
      if (params.skip) url.searchParams.set('skip', params.skip.toString());

      const res = await fetch(url.toString());
      const json = await res.json();
      return json.success ? json.data : [];
    } catch (e) {
      console.warn('Failed to search series', e);
      return [];
    }
  },

  async getSeriesDetail(slug: string): Promise<SeriesDetail | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(`${API_BASE_URL}/api/series/${slug}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      return json.success ? json.data : null;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        console.warn('Series detail request timed out for:', slug);
      } else {
        console.warn('Failed to fetch series detail', e);
      }
      return null;
    }
  }
};
