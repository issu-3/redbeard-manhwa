import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface LibrarySeriesEntity {
  seriesId: string;
  title: string;
  slug: string;
  coverImage: string | null;
  cachedCoverUri?: string; // Local capacitor URI
  addedAt: number;
}

interface AppLibraryStore {
  savedSeries: Record<string, LibrarySeriesEntity>;
  addToLibrary: (series: Omit<LibrarySeriesEntity, 'addedAt'>) => void;
  removeFromLibrary: (seriesId: string) => void;
  updateLibrarySeries: (seriesId: string, data: Partial<LibrarySeriesEntity>) => void;
  isSaved: (seriesId: string) => boolean;
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const isNativeApp = () => {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform() || navigator.userAgent.includes('RedbeardApp');
};

const capacitorStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!isNativeApp()) {
      return typeof window !== 'undefined' ? localStorage.getItem(name) : null;
    }
    try {
      const { value } = await Preferences.get({ key: name });
      console.log(`[AppLibraryStore] Preferences.get(${name}) returned:`, value ? 'data present' : 'null');
      return value;
    } catch (e) {
      console.error('[AppLibraryStore] Preferences.get error:', e);
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!isNativeApp()) {
      if (typeof window !== 'undefined') localStorage.setItem(name, value);
      return;
    }
    try {
      await Preferences.set({ key: name, value });
      console.log(`[AppLibraryStore] Preferences.set(${name}) completed successfully.`);
    } catch (e) {
      console.error('[AppLibraryStore] Preferences.set error:', e);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!isNativeApp()) {
      if (typeof window !== 'undefined') localStorage.removeItem(name);
      return;
    }
    try {
      await Preferences.remove({ key: name });
      console.log(`[AppLibraryStore] Preferences.remove(${name}) completed successfully.`);
    } catch (e) {
      console.error('[AppLibraryStore] Preferences.remove error:', e);
    }
  },
};

export const useAppLibraryStore = create<AppLibraryStore>()(
  persist(
    (set, get) => ({
      savedSeries: {},
      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),

      addToLibrary: (series) => {
        // Prevent adding if not hydrated yet to avoid state overwrite anomalies
        if (!get().hasHydrated) {
          console.warn('[AppLibraryStore] Attempted to add to library before hydration finished.');
        }
        set((state) => {
          if (state.savedSeries[series.seriesId]) {
            return state; // Already saved
          }
          return {
            savedSeries: {
              ...state.savedSeries,
              [series.seriesId]: { ...series, addedAt: Date.now() },
            }
          };
        });
      },

      removeFromLibrary: (seriesId) => set((state) => {
        const newSaved = { ...state.savedSeries };
        delete newSaved[seriesId];
        return { savedSeries: newSaved };
      }),
      
      updateLibrarySeries: (seriesId, data) => set((state) => {
        const existing = state.savedSeries[seriesId];
        if (!existing) return state;
        return {
          savedSeries: {
            ...state.savedSeries,
            [seriesId]: { ...existing, ...data }
          }
        };
      }),

      isSaved: (seriesId) => {
        return !!get().savedSeries[seriesId];
      },
    }),
    {
      name: 'redbeard-app-library-storage',
      storage: createJSONStorage(() => capacitorStorage),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[AppLibraryStore] Hydration failed:', error);
        }
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);
