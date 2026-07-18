import type { SeriesCardData } from './series';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchParams {
  query?: string;
  genres?: string[];
  tags?: string[];
  status?: string;
  type?: string;
  sort?: 'latest' | 'popular' | 'rating' | 'views' | 'bookmarks' | 'alphabetical' | 'updated';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  year?: number;
  author?: string;
  artist?: string;
}

export interface SearchResult {
  series: SeriesCardData[];
  total: number;
  suggestions?: string[];
}
