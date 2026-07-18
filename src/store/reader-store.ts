import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReaderMode = 'vertical' | 'horizontal' | 'longStrip' | 'singlePage' | 'doublePage';
export type ReadingDirection = 'ltr' | 'rtl';
export type FitMode = 'width' | 'height' | 'original';

interface ReaderState {
  mode: ReaderMode;
  direction: ReadingDirection;
  fitMode: FitMode;
  currentPage: number;
  totalPages: number;
  isFullscreen: boolean;
  isUIHidden: boolean;
  brightness: number;
  contrast: number;
  sepia: number;
  autoScroll: boolean;
  autoScrollSpeed: number;
  autoNextChapter: boolean;
  zoom: number;
  showProgress: boolean;

  setMode: (mode: ReaderMode) => void;
  setDirection: (direction: ReadingDirection) => void;
  setFitMode: (fitMode: FitMode) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  toggleFullscreen: () => void;
  toggleUI: () => void;
  setBrightness: (brightness: number) => void;
  setContrast: (contrast: number) => void;
  setSepia: (sepia: number) => void;
  toggleAutoScroll: () => void;
  setAutoScrollSpeed: (speed: number) => void;
  toggleAutoNextChapter: () => void;
  setZoom: (zoom: number) => void;
  resetFilters: () => void;
  nextPage: () => void;
  prevPage: () => void;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      mode: 'vertical',
      direction: 'ltr',
      fitMode: 'width',
      currentPage: 1,
      totalPages: 0,
      isFullscreen: false,
      isUIHidden: false,
      brightness: 100,
      contrast: 100,
      sepia: 0,
      autoScroll: false,
      autoScrollSpeed: 2,
      autoNextChapter: true,
      zoom: 100,
      showProgress: true,

      setMode: (mode) => set({ mode }),
      setDirection: (direction) => set({ direction }),
      setFitMode: (fitMode) => set({ fitMode }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setTotalPages: (total) => set({ totalPages: total }),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
      toggleUI: () => set((state) => ({ isUIHidden: !state.isUIHidden })),
      setBrightness: (brightness) => set({ brightness }),
      setContrast: (contrast) => set({ contrast }),
      setSepia: (sepia) => set({ sepia }),
      toggleAutoScroll: () => set((state) => ({ autoScroll: !state.autoScroll })),
      setAutoScrollSpeed: (speed) => set({ autoScrollSpeed: speed }),
      toggleAutoNextChapter: () => set((state) => ({ autoNextChapter: !state.autoNextChapter })),
      setZoom: (zoom) => set({ zoom }),
      resetFilters: () => set({ brightness: 100, contrast: 100, sepia: 0, zoom: 100 }),
      nextPage: () => {
        const { currentPage, totalPages } = get();
        if (currentPage < totalPages) set({ currentPage: currentPage + 1 });
      },
      prevPage: () => {
        const { currentPage } = get();
        if (currentPage > 1) set({ currentPage: currentPage - 1 });
      },
    }),
    {
      name: 'redbeard-reader-preferences',
      partialize: (state) => ({
        mode: state.mode,
        direction: state.direction,
        fitMode: state.fitMode,
        brightness: state.brightness,
        contrast: state.contrast,
        sepia: state.sepia,
        autoScrollSpeed: state.autoScrollSpeed,
        autoNextChapter: state.autoNextChapter,
        showProgress: state.showProgress,
      }),
    }
  )
);
