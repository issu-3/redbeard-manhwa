import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface LibrarySeriesEntity {
  seriesId: string;
  title: string;
  slug: string;
  coverImage: string | null;
  cachedCoverUri?: string; // Local capacitor URI
  status?: string | null;
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

  private static getStorageKey(userId: string) {
    return `redbeard_lib_${userId}`;
  }

  static async setLastUserId(userId: string): Promise<void> {
    if (!this.isNativeApp()) return;
    try {
      await Preferences.set({ key: 'last_authenticated_user_id', value: userId });
    } catch (e) {
      console.error('[LocalLibraryRepository] failed to set last user id', e);
    }
  }

  static async getLastUserId(): Promise<string | null> {
    if (!this.isNativeApp()) return null;
    try {
      const { value } = await Preferences.get({ key: 'last_authenticated_user_id' });
      return value;
    } catch (e) {
      return null;
    }
  }

  static async getAllSeries(userId: string): Promise<LocalLibraryData> {
    if (!this.isNativeApp()) return {};
    try {
      const { value } = await Preferences.get({ key: this.getStorageKey(userId) });
      if (!value) return {};
      return JSON.parse(value) as LocalLibraryData;
    } catch (e) {
      console.error('[LocalLibraryRepository] getAllSeries failed', e);
      return {};
    }
  }

  static async getSeries(userId: string, seriesId: string): Promise<LibrarySeriesEntity | null> {
    const library = await this.getAllSeries(userId);
    return library[seriesId] || null;
  }

  static async clearUserLibrary(userId: string): Promise<void> {
    if (!this.isNativeApp()) return;
    try {
      await Preferences.remove({ key: this.getStorageKey(userId) });
    } catch (e) {
      console.error('[LocalLibraryRepository] clearUserLibrary failed', e);
    }
  }

  static async saveLibrary(userId: string, data: LocalLibraryData): Promise<void> {
    if (!this.isNativeApp()) return;
    try {
      await Preferences.set({ key: this.getStorageKey(userId), value: JSON.stringify(data) });
    } catch (e) {
      console.error('[LocalLibraryRepository] saveLibrary failed', e);
    }
  }

  static async addSeries(userId: string, series: Omit<LibrarySeriesEntity, 'addedAt' | 'updatedAt' | 'isBookmarked'>): Promise<LocalLibraryData> {
    const library = await this.getAllSeries(userId);
    if (!library[series.seriesId]) {
      const now = Date.now();
      library[series.seriesId] = { ...series, addedAt: now, updatedAt: now, isBookmarked: true };
      await this.saveLibrary(userId, library);
    }
    return library;
  }

  static async removeSeries(userId: string, seriesId: string): Promise<LocalLibraryData> {
    const library = await this.getAllSeries(userId);
    if (library[seriesId]) {
      delete library[seriesId];
      await this.saveLibrary(userId, library);
    }
    return library;
  }

  static async updateSeries(userId: string, seriesId: string, data: Partial<LibrarySeriesEntity>): Promise<LocalLibraryData> {
    const library = await this.getAllSeries(userId);
    if (library[seriesId]) {
      library[seriesId] = { ...library[seriesId], ...data, updatedAt: Date.now() };
      await this.saveLibrary(userId, library);
    }
    return library;
  }

  static async syncWithServer(userId: string, serverSeriesList: Omit<LibrarySeriesEntity, 'addedAt' | 'updatedAt' | 'isBookmarked'>[]): Promise<LocalLibraryData> {
    const localLibrary = await this.getAllSeries(userId);
    
    // We want to keep local cover cache URIs if they exist, but update from the server data.
    const newLibrary: LocalLibraryData = {};
    
    for (const serverSeries of serverSeriesList) {
      const existing = localLibrary[serverSeries.seriesId];
      if (existing) {
        newLibrary[serverSeries.seriesId] = {
          ...serverSeries,
          addedAt: existing.addedAt,
          cachedCoverUri: existing.cachedCoverUri,
          isBookmarked: true,
          updatedAt: Date.now(),
          lastSyncedAt: Date.now(),
        };
      } else {
        newLibrary[serverSeries.seriesId] = {
          ...serverSeries,
          addedAt: Date.now(),
          updatedAt: Date.now(),
          isBookmarked: true,
          lastSyncedAt: Date.now(),
        };
      }
    }

    await this.saveLibrary(userId, newLibrary);
    return newLibrary;
  }
}
