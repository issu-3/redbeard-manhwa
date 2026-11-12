
## 2025-05-18 - Zustand Selector Pattern for High-Volume List Items
**Learning:** Using `const store = useAppLibraryStore()` without a selector in a heavily used component like `SeriesCard` subscribes that component to *every* global state change in the store. When rendering lists or grids (e.g. `Carousel`, `SearchClient`), this creates an O(N) re-render bottleneck across the entire app whenever completely unrelated library state changes.
**Action:** Always use specific state selectors (`useAppLibraryStore(state => state.specificData)`) combined with `React.memo` when a component represents a list item connected to a global store to prevent cascading O(N) re-renders.

## 2024-05-18 - Avoid full-store Zustand subscriptions in highly active components
**Learning:** Destructuring properties directly from a Zustand hook (e.g., `const { savedSeries } = useAppLibraryStore()`) or calling it without arguments (`const store = useAppLibraryStore()`) forces the component to subscribe to the entire store. In highly active stores like `AppLibraryStore` or `DownloadStore`, this causes unnecessary O(N) re-renders across many components even when unrelated state changes.
**Action:** Always use atomic selectors (e.g., `useAppLibraryStore(state => state.savedSeries)`) to subscribe components only to the specific pieces of state they use. This is especially critical for UI components like `AndroidSeriesView` and `BookmarkButton` to maintain 60FPS.
