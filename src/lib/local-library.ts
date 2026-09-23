import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SeriesRepository } from './sqlite/repository';

export interface LibrarySeriesEntity {
  seriesId: string;
  title: string;
  slug: string;
  coverImage: string | null;
  cachedCoverUri?: string; // Local capacitor URI
  status?: string | null;
  author?: string | null;
  artist?: string | null;
  description?: string | null;
  genres?: any;
  isBookmarked: boolean;
  latestChapterId?: string | null;
  latestChapterNumber?: number | null;
  continueReadingChapter?: number | null;
  addedAt: number;
  updatedAt: number;
  lastSyncedAt?: number;
}

export type LocalLibraryData = Record<string, LibrarySeriesEntity>;

export class LocalLibraryRepository {
  private static isNativeApp() {
    if (typeof window === 'undefined') return false;
    return Capacitor.isNativePlatform() || navigator.userAgent.includes('RedbeardApp');
  }

  static async setLastUserId(userId: string): Promise<void> {
    if (!this.isNativeApp()) return;
    try {
      await Preferences.set({ key: 'last_authenticated_user_id', value: userId });
    } catch (e) {
      console.error('[LIBRARY_DEBUG] failed to set last user id', e);
    }
  }

  static async getLastUserId(): Promise<string | null> {
    if (!this.isNativeApp()) return null;
    try {
      const { value } = await Preferences.get({ key: 'last_authenticated_user_id' });
      if (value) {
        return value;
      }
      return null;
    } catch (e) {
      console.error('[LIBRARY_DEBUG] failed to get last user id', e);
      return null;
    }
  }

  static async getAllSeries(userId: string): Promise<LocalLibraryData> {
    if (!this.isNativeApp()) return {};
    
    try {
      // Use SQLite repository
      const seriesList = await SeriesRepository.getLibrary(userId);
      const data: LocalLibraryData = {};
      
      for (const s of seriesList) {
        data[s.seriesId] = {
          seriesId: s.seriesId,
          title: s.title,
          slug: s.slug,
          coverImage: s.coverImage || null,
          status: s.status,
          isBookmarked: true,
          addedAt: Date.now(), // we might want to read this from sqlite later
          updatedAt: Date.now(),
        };
      }
      return data;
    } catch (e) {
      console.error('[LIBRARY_DEBUG] getAllSeries failed', e);
      return {};
    }
  }

  static async getSeries(userId: string, seriesId: string): Promise<LibrarySeriesEntity | null> {
    if (!this.isNativeApp()) return null;
    const series = await SeriesRepository.getSeries(userId, seriesId);
    if (!series) return null;
    
    return {
      seriesId: series.seriesId,
      title: series.title,
      slug: series.slug,
      coverImage: series.coverImage || null,
      status: series.status,
      isBookmarked: true,
      addedAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  static async clearUserLibrary(userId: string): Promise<void> {
    if (!this.isNativeApp()) return;
    
    // As per P0 requirements: "Explicitly defined to clear all associated user metadata from SQLite and purge downloaded PDFs"
    await SeriesRepository.clearUserData(userId);
    
    try {
      await Preferences.remove({ key: 'last_authenticated_user_id' });
      // We could also trigger a clean up of downloaded files here or through a global store.
      // For now, removing the user scoped data is the primary action.
    } catch (e) {
      console.error('[LIBRARY_DEBUG] clearUserLibrary failed', e);
    }
  }

  static async addSeries(userId: string, series: Omit<LibrarySeriesEntity, 'addedAt' | 'updatedAt' | 'isBookmarked'>): Promise<LocalLibraryData> {
    if (!this.isNativeApp()) return {};
    
    await SeriesRepository.saveToLibrary(userId, {
      id: series.seriesId,
      title: series.title,
      slug: series.slug,
      coverImage: series.coverImage || undefined,
      status: series.status || undefined,
    } as any);

    return this.getAllSeries(userId);
  }

  static async removeSeries(userId: string, seriesId: string): Promise<LocalLibraryData> {
    if (!this.isNativeApp()) return {};
    
    await SeriesRepository.removeFromLibrary(userId, seriesId);
    return this.getAllSeries(userId);
  }

  static async updateSeries(userId: string, seriesId: string, data: Partial<LibrarySeriesEntity>): Promise<LocalLibraryData> {
    if (!this.isNativeApp()) return {};
    // SQLite: Partial updates not fully mapped yet in SeriesRepository, but we can save it again.
    const existing = await SeriesRepository.getSeries(userId, seriesId);
    if (existing) {
      await SeriesRepository.saveToLibrary(userId, {
        ...existing,
        ...data,
        coverImage: data.coverImage === null ? undefined : data.coverImage || existing.coverImage
      } as any);
    }
    return this.getAllSeries(userId);
  }

  static async syncWithServer(userId: string, serverSeriesList: Omit<LibrarySeriesEntity, 'addedAt' | 'updatedAt' | 'isBookmarked'>[]): Promise<LocalLibraryData> {
    if (!this.isNativeApp()) return {};
    
    // Map to expected server format
    const serverData = serverSeriesList.map(s => ({
      series: {
        id: s.seriesId,
        title: s.title,
        slug: s.slug,
        coverImage: s.coverImage || undefined,
        status: s.status || undefined,
      }
    }));
    
    await SeriesRepository.syncLibrary(userId, serverData);
    
    return this.getAllSeries(userId);
  }
}
