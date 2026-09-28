import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReaderMode = 'vertical' | 'horizontal' | 'longStrip' | 'singlePage' | 'doublePage';
export type ReadingDirection = 'ltr' | 'rtl';
export type FitMode = 'width' | 'height' | 'original' | 'smart';
export type BackgroundColor = 'black' | 'white' | 'gray';
export type RotationMode = 'default' | 'free' | 'portrait' | 'landscape' | 'lockedPortrait' | 'lockedLandscape' | 'reversePortrait';
export type NavigatorPosition = 'left' | 'right';

interface ReaderState {
  mode: ReaderMode;
  direction: ReadingDirection;
  fitMode: FitMode;
  backgroundColor: BackgroundColor;
  currentPage: number;
  totalPages: number;
  isFullscreen: boolean;
  isUIHidden: boolean;
  brightness: number;
  contrast: number;
  sepia: number;
  grayscale: boolean;
  inverted: boolean;
  colorFilter: string; // hex color for overlay
  autoScroll: boolean;
  autoScrollSpeed: number;
  autoNextChapter: boolean;
  zoom: number;
  showProgress: boolean;
  cropBorders: boolean;
  doubleTapZoom: boolean;
  pageTransitions: boolean;
  showPageNumber: boolean;
  longStripGap: boolean;
  rotationMode: RotationMode;
  verticalNavigatorPosition: NavigatorPosition;
  navigatorHeight: number;

  setMode: (mode: ReaderMode) => void;
  setDirection: (direction: ReadingDirection) => void;
  setFitMode: (fitMode: FitMode) => void;
  setBackgroundColor: (color: BackgroundColor) => void;
  setCurrentPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  toggleFullscreen: () => void;
  toggleUI: () => void;
  setBrightness: (brightness: number) => void;
  setContrast: (contrast: number) => void;
  setSepia: (sepia: number) => void;
  toggleGrayscale: () => void;
  toggleInverted: () => void;
  setColorFilter: (color: string) => void;
  toggleAutoScroll: () => void;
  setAutoScrollSpeed: (speed: number) => void;
  toggleAutoNextChapter: () => void;
  setZoom: (zoom: number) => void;
  resetFilters: () => void;
  nextPage: () => void;
  prevPage: () => void;
  toggleCropBorders: () => void;
  toggleDoubleTapZoom: () => void;
  togglePageTransitions: () => void;
  toggleShowPageNumber: () => void;
  toggleLongStripGap: () => void;
  setRotationMode: (mode: RotationMode) => void;
  setVerticalNavigatorPosition: (position: NavigatorPosition) => void;
  setNavigatorHeight: (height: number) => void;
}

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      mode: 'vertical',
      direction: 'ltr',
      fitMode: 'width',
      backgroundColor: 'black',
      currentPage: 1,
      totalPages: 0,
      isFullscreen: false,
      isUIHidden: true, // Default immersive
      brightness: 100, // 100% means no dark overlay
      contrast: 100,
      sepia: 0,
      grayscale: false,
      inverted: false,
      colorFilter: 'transparent',
      autoScroll: false,
      autoScrollSpeed: 2,
      autoNextChapter: true,
      zoom: 100,
      showProgress: true,
      cropBorders: false,
      doubleTapZoom: true,
      pageTransitions: false,
      showPageNumber: true,
      longStripGap: false,
      rotationMode: 'default',
      verticalNavigatorPosition: 'right',
      navigatorHeight: 60,

      setMode: (mode) => set({ mode }),
      setDirection: (direction) => set({ direction }),
      setFitMode: (fitMode) => set({ fitMode }),
      setBackgroundColor: (color) => set({ backgroundColor: color }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setTotalPages: (total) => set({ totalPages: total }),
      toggleFullscreen: () => set((state) => ({ isFullscreen: !state.isFullscreen })),
      toggleUI: () => set((state) => ({ isUIHidden: !state.isUIHidden })),
      setBrightness: (brightness) => set({ brightness }),
      setContrast: (contrast) => set({ contrast }),
      setSepia: (sepia) => set({ sepia }),
      toggleGrayscale: () => set((state) => ({ grayscale: !state.grayscale })),
      toggleInverted: () => set((state) => ({ inverted: !state.inverted })),
      setColorFilter: (colorFilter) => set({ colorFilter }),
      toggleAutoScroll: () => set((state) => ({ autoScroll: !state.autoScroll })),
      setAutoScrollSpeed: (speed) => set({ autoScrollSpeed: speed }),
      toggleAutoNextChapter: () => set((state) => ({ autoNextChapter: !state.autoNextChapter })),
      setZoom: (zoom) => set({ zoom }),
      resetFilters: () => set({ brightness: 100, contrast: 100, sepia: 0, zoom: 100, grayscale: false, inverted: false, colorFilter: 'transparent' }),
      nextPage: () => {
        const { currentPage, totalPages } = get();
        if (currentPage < totalPages) set({ currentPage: currentPage + 1 });
      },
      prevPage: () => {
        const { currentPage } = get();
        if (currentPage > 1) set({ currentPage: currentPage - 1 });
      },
      toggleCropBorders: () => set((state) => ({ cropBorders: !state.cropBorders })),
      toggleDoubleTapZoom: () => set((state) => ({ doubleTapZoom: !state.doubleTapZoom })),
      togglePageTransitions: () => set((state) => ({ pageTransitions: !state.pageTransitions })),
      toggleShowPageNumber: () => set((state) => ({ showPageNumber: !state.showPageNumber })),
      toggleLongStripGap: () => set((state) => ({ longStripGap: !state.longStripGap })),
      setRotationMode: (rotationMode) => set({ rotationMode }),
      setVerticalNavigatorPosition: (verticalNavigatorPosition) => set({ verticalNavigatorPosition }),
      setNavigatorHeight: (navigatorHeight) => set({ navigatorHeight }),
    }),
    {
      name: 'redbeard-reader-preferences',
      partialize: (state) => ({
        mode: state.mode,
        direction: state.direction,
        fitMode: state.fitMode,
        backgroundColor: state.backgroundColor,
        brightness: state.brightness,
        contrast: state.contrast,
        sepia: state.sepia,
        grayscale: state.grayscale,
        inverted: state.inverted,
        colorFilter: state.colorFilter,
        autoScrollSpeed: state.autoScrollSpeed,
        autoNextChapter: state.autoNextChapter,
        showProgress: state.showProgress,
        cropBorders: state.cropBorders,
        doubleTapZoom: state.doubleTapZoom,
        pageTransitions: state.pageTransitions,
        showPageNumber: state.showPageNumber,
        longStripGap: state.longStripGap,
        rotationMode: state.rotationMode,
        verticalNavigatorPosition: state.verticalNavigatorPosition,
        navigatorHeight: state.navigatorHeight,
      }),
    }
  )
);
