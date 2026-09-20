import { create } from 'zustand';
import { LocalLibraryRepository, LocalLibraryData, LibrarySeriesEntity } from '@/lib/local-library';

interface AppLibraryStore {
  savedSeries: LocalLibraryData;
  hasHydrated: boolean;
  activeUserId: string | null;
  
  // State actions
  setHasHydrated: (state: boolean) => void;
  setActiveUserId: (userId: string | null) => void;
  
  // Library actions
  hydrateLibrary: (userId: string) => Promise<void>;
  addToLibrary: (series: Omit<LibrarySeriesEntity, 'addedAt' | 'updatedAt' | 'isBookmarked'>) => Promise<void>;
  removeFromLibrary: (seriesId: string) => Promise<void>;
  updateLibrarySeries: (seriesId: string, data: Partial<LibrarySeriesEntity>) => Promise<void>;
  syncWithServer: (userId: string, serverSeriesList: Omit<LibrarySeriesEntity, 'addedAt' | 'updatedAt' | 'isBookmarked'>[]) => Promise<void>;
  
  // Queries
  isSaved: (seriesId: string) => boolean;
}

export const useAppLibraryStore = create<AppLibraryStore>()((set, get) => ({
  savedSeries: {},
  hasHydrated: false,
  activeUserId: null,

  setHasHydrated: (state) => set({ hasHydrated: state }),
  setActiveUserId: (userId) => set({ activeUserId: userId }),

  hydrateLibrary: async (userId: string) => {
    try {
      const library = await LocalLibraryRepository.getAllSeries(userId);
      set({ savedSeries: library, hasHydrated: true, activeUserId: userId });
      await LocalLibraryRepository.setLastUserId(userId);
    } catch (e) {
      console.error('[AppLibraryStore] Hydration failed:', e);
      set({ hasHydrated: true });
    }
  },

  addToLibrary: async (series) => {
    const { activeUserId, hasHydrated } = get();
    if (!hasHydrated) {
      console.warn('[AppLibraryStore] Attempted to add to library before hydration finished.');
    }
    
    // Update local UI state immediately for optimistic UI
    set((state) => {
      if (state.savedSeries[series.seriesId]) return state;
      return {
        savedSeries: {
          ...state.savedSeries,
          [series.seriesId]: { ...series, addedAt: Date.now(), updatedAt: Date.now(), isBookmarked: true },
        }
      };
    });

    // Persist if we have an active user
    if (activeUserId) {
      await LocalLibraryRepository.addSeries(activeUserId, series);
    }
  },

  removeFromLibrary: async (seriesId) => {
    const { activeUserId } = get();
    
    // Update UI immediately
    set((state) => {
      const newSaved = { ...state.savedSeries };
      delete newSaved[seriesId];
      return { savedSeries: newSaved };
    });

    // Persist
    if (activeUserId) {
      await LocalLibraryRepository.removeSeries(activeUserId, seriesId);
    }
  },
  
  updateLibrarySeries: async (seriesId, data) => {
    const { activeUserId } = get();
    
    set((state) => {
      const existing = state.savedSeries[seriesId];
      if (!existing) return state;
      return {
        savedSeries: {
          ...state.savedSeries,
          [seriesId]: { ...existing, ...data }
        }
      };
    });

    if (activeUserId) {
      await LocalLibraryRepository.updateSeries(activeUserId, seriesId, data);
    }
  },

  syncWithServer: async (userId: string, serverSeriesList: Omit<LibrarySeriesEntity, 'addedAt' | 'updatedAt' | 'isBookmarked'>[]) => {
    try {
      const syncedLibrary = await LocalLibraryRepository.syncWithServer(userId, serverSeriesList);
      set({ savedSeries: syncedLibrary, hasHydrated: true, activeUserId: userId });
    } catch (e) {
      console.error('[AppLibraryStore] Sync failed:', e);
    }
  },

  isSaved: (seriesId) => {
    return !!get().savedSeries[seriesId];
  },
}));
