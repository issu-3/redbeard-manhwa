import { create } from 'zustand';
import { SeriesDAO } from '../db/dao';
import type { Series } from '../db/dao';


interface LibraryState {
  series: Series[];
  isLoading: boolean;
  isSyncing: boolean;
  loadLocal: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  toggleBookmark: (series: Series) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  series: [],
  isLoading: true,
  isSyncing: false,

  loadLocal: async () => {
    set({ isLoading: true });
    try {
      const localSeries = await SeriesDAO.getAllBookmarked();
      set({ series: localSeries, isLoading: false });
    } catch (e) {
      console.error('Failed to load local library', e);
      set({ isLoading: false });
    }
  },

  syncWithServer: async () => {
    // Phase 2 server sync removed as per requirements.
    // Do NOT implement two-way server synchronization.
    set({ isSyncing: false });
  },

  toggleBookmark: async (series: Series) => {
    const newBookmarked = !series.bookmarked;
    await SeriesDAO.upsert({ ...series, bookmarked: newBookmarked, updatedAt: Date.now() });
    await get().loadLocal();
  }
}));
