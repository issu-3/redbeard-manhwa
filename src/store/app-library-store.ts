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

const capacitorStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!Capacitor.isNativePlatform()) {
      return typeof window !== 'undefined' ? localStorage.getItem(name) : null;
    }
    const { value } = await Preferences.get({ key: name });
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== 'undefined') localStorage.setItem(name, value);
      return;
    }
    await Preferences.set({ key: name, value });
  },
  removeItem: async (name: string): Promise<void> => {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== 'undefined') localStorage.removeItem(name);
      return;
    }
    await Preferences.remove({ key: name });
  },
};

export const useAppLibraryStore = create<AppLibraryStore>()(
  persist(
    (set, get) => ({
      savedSeries: {},
      hasHydrated: false,
      setHasHydrated: (state) => set({ hasHydrated: state }),

      addToLibrary: (series) => set((state) => {
        if (state.savedSeries[series.seriesId]) {
          return state; // Already saved
        }
        return {
          savedSeries: {
            ...state.savedSeries,
            [series.seriesId]: { ...series, addedAt: Date.now() },
          }
        };
      }),

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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
