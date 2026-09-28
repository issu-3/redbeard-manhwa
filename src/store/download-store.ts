import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** After this many total attempts (across restarts), the download is permanently failed. */
export const MAX_LIFETIME_ATTEMPTS = 9;

export type DownloadStateStatus = 'IDLE' | 'QUEUED' | 'RESOLVING' | 'DOWNLOADING' | 'VALIDATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DownloadMetadata {
  seriesId: string;
  seriesTitle: string;
  seriesSlug: string;
  chapterNumber: string | number;
  chapterId?: string;
  filename: string;
  coverImage?: string;
  sourceType?: 'DOWNLOAD' | 'IMPORTED';
  fileSize?: number;
}

export interface DownloadState {
  status: DownloadStateStatus;
  progress: number;
  localUri?: string;
  error?: string | null;
  attempts?: number;
  metadata?: DownloadMetadata;
  createdAt: number;
  completedAt?: number;
  sourceType?: 'DOWNLOAD' | 'IMPORTED';
}

interface DownloadStore {
  downloads: Record<string, DownloadState>;
  queueDownload: (chapterId: string, metadata: DownloadMetadata) => void;
  startDownload: (chapterId: string, metadata?: DownloadMetadata) => void;
  markResolving: (chapterId: string) => void;
  markValidating: (chapterId: string) => void;
  updateProgress: (chapterId: string, progress: number) => void;
  markCompleted: (chapterId: string, localUri: string) => void;
  markFailed: (chapterId: string, error: string) => void;
  markCancelled: (chapterId: string) => void;
  requeueDownload: (chapterId: string) => void;
  clearDownload: (chapterId: string) => void;
  getDownloadState: (chapterId: string) => DownloadState;
  hydrateFromDisk: (chapterId: string, status: DownloadStateStatus, localUri?: string) => void;
  importFile: (chapterId: string, metadata: DownloadMetadata, localUri: string) => void;
  deleteLocalChapter: (chapterId: string) => Promise<void>;
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

      queueDownload: (chapterId, metadata) => set((state) => ({
        downloads: {
          ...state.downloads,
          [chapterId]: {
            status: 'QUEUED',
            progress: 0,
            metadata,
            createdAt: Date.now()
          }
        }
      })),

      startDownload: (chapterId, metadata) => set((state) => {
        const current = state.downloads[chapterId];
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: {
              ...(current || {}),
              status: 'DOWNLOADING',
              progress: 0,
              metadata: metadata || current?.metadata,
              createdAt: current?.createdAt || Date.now()
            }
          }
        };
      }),

      markResolving: (chapterId) => set((state) => {
        const current = state.downloads[chapterId];
        if (!current) return state;
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: { ...current, status: 'RESOLVING' }
          }
        };
      }),

      markValidating: (chapterId) => set((state) => {
        const current = state.downloads[chapterId];
        if (!current) return state;
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: { ...current, status: 'VALIDATING' }
          }
        };
      }),

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

      requeueDownload: (chapterId) => set((state) => {
        const current = state.downloads[chapterId];
        if (!current) return state;
        return {
          downloads: {
            ...state.downloads,
            [chapterId]: {
              ...current,
              status: 'QUEUED',
              attempts: (current.attempts ?? 0) + 1
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
      }),

      importFile: (chapterId, metadata, localUri) => set((state) => ({
        downloads: {
          ...state.downloads,
          [chapterId]: {
            status: 'COMPLETED',
            progress: 1,
            localUri,
            metadata: {
              ...metadata,
              sourceType: 'IMPORTED'
            },
            sourceType: 'IMPORTED',
            createdAt: Date.now(),
            completedAt: Date.now()
          }
        }
      })),

      deleteLocalChapter: async (chapterId) => {
        // Filesystem deletion is handled by deleteDownloadedChapter in native-download.ts.
        // This only clears the Zustand entry; prefer calling deleteDownloadedChapter directly.
        get().clearDownload(chapterId);
      }
    }),
    {
      name: 'redbeard-downloads-storage',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          const downloads = persisted.downloads || {};
          Object.values(downloads).forEach((d: any) => {
            d.attempts = d.attempts ?? 0;
            if (['DOWNLOADING', 'RESOLVING', 'VALIDATING'].includes(d.status)) {
              d.status = 'QUEUED';
            }
          });
        }
        return persisted;
      },
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { },
        };
      }),
      partialize: (state) => ({ downloads: state.downloads }),
    }
  )
);

/**
 * On app startup, re-queue any downloads that were interrupted mid-flight.
 * Preserves the attempt counter so downloads that consistently fail
 * will eventually hit MAX_LIFETIME_ATTEMPTS and stop retrying.
 */
export function reconcileInterruptedDownloads(): void {
  const { downloads } = useDownloadStore.getState();
  let changed = false;
  const fixed = { ...downloads };
  for (const [id, d] of Object.entries(fixed)) {
    if (['DOWNLOADING', 'RESOLVING', 'VALIDATING'].includes(d.status)) {
      const attempts = (d.attempts ?? 0) + 1;
      if (attempts >= MAX_LIFETIME_ATTEMPTS) {
        // Permanently fail after too many total attempts across restarts
        fixed[id] = { ...d, status: 'FAILED', error: 'Too many failed attempts. Tap to retry manually.', attempts };
      } else {
        fixed[id] = { ...d, status: 'QUEUED', error: null, attempts };
      }
      changed = true;
    }
  }
  if (changed) {
    useDownloadStore.setState({ downloads: fixed });
  }
}

