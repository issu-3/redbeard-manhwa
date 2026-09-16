import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DownloadStateStatus = 'IDLE' | 'QUEUED' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DownloadMetadata {
  seriesId: string;
  seriesTitle: string;
  seriesSlug: string;
  chapterNumber: string | number;
  filename: string;
  coverImage?: string;
}

export interface DownloadState {
  status: DownloadStateStatus;
  progress: number;
  localUri?: string;
  error?: string;
  metadata?: DownloadMetadata;
  createdAt: number;
  completedAt?: number;
}

interface DownloadStore {
  downloads: Record<string, DownloadState>;
  startDownload: (chapterId: string, metadata: DownloadMetadata) => void;
  updateProgress: (chapterId: string, progress: number) => void;
  markCompleted: (chapterId: string, localUri: string) => void;
  markFailed: (chapterId: string, error: string) => void;
  markCancelled: (chapterId: string) => void;
  clearDownload: (chapterId: string) => void;
  getDownloadState: (chapterId: string) => DownloadState;
  hydrateFromDisk: (chapterId: string, status: DownloadStateStatus, localUri?: string) => void;
}

const defaultState: DownloadState = {
  status: 'IDLE',
  progress: 0,
  createdAt: 0,
};

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, get) => ({
      downloads: {},
      
      startDownload: (chapterId, metadata) => set((state) => ({
        downloads: {
          ...state.downloads,
          [chapterId]: { 
            status: 'DOWNLOADING', 
            progress: 0, 
            metadata, 
            createdAt: Date.now() 
          }
        }
      })),

      updateProgress: (chapterId, progress) => set((state) => {
        const current = state.downloads[chapterId];
        if (!current || current.status !== 'DOWNLOADING') return state;
        
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: { ...current, progress }
          }
        };
      }),

      markCompleted: (chapterId, localUri) => set((state) => {
        const current = state.downloads[chapterId];
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: { 
              ...(current || defaultState), 
              status: 'COMPLETED', 
              progress: 1, 
              localUri,
              completedAt: Date.now()
            }
          }
        };
      }),

      markFailed: (chapterId, error) => set((state) => {
        const current = state.downloads[chapterId];
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: { 
              ...(current || defaultState), 
              status: 'FAILED', 
              progress: 0, 
              error 
            }
          }
        };
      }),

      markCancelled: (chapterId) => set((state) => {
        const current = state.downloads[chapterId];
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: { 
              ...(current || defaultState), 
              status: 'CANCELLED', 
              progress: 0
            }
          }
        };
      }),

      clearDownload: (chapterId) => set((state) => {
        const newDownloads = { ...state.downloads };
        delete newDownloads[chapterId];
        return { downloads: newDownloads };
      }),

      getDownloadState: (chapterId) => {
        return get().downloads[chapterId] || defaultState;
      },

      hydrateFromDisk: (chapterId, status, localUri) => set((state) => {
        const current = state.downloads[chapterId];
        if (!current) return state; // Don't hydrate if we don't have metadata
        
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: {
              ...current,
              status,
              localUri: localUri || current.localUri,
              progress: status === 'COMPLETED' ? 1 : 0
            }
          }
        };
      })
    }),
    {
      name: 'redbeard-downloads-storage',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage; // or IndexedDB if preferred, but localStorage works for simple metadata
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => {
        const persistedDownloads: Record<string, DownloadState> = {};
        for (const [key, value] of Object.entries(state.downloads)) {
          // Persist all metadata so we can verify files on boot,
          // but don't persist active downloading states as they are dead if app died
          if (value.status === 'DOWNLOADING') {
            persistedDownloads[key] = { ...value, status: 'FAILED', error: 'Download interrupted' };
          } else {
            persistedDownloads[key] = value;
          }
        }
        return { downloads: persistedDownloads };
      },
    }
  )
);
