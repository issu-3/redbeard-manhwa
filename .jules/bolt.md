
## 2025-05-18 - Zustand Selector Pattern for High-Volume List Items
**Learning:** Using `const store = useAppLibraryStore()` without a selector in a heavily used component like `SeriesCard` subscribes that component to *every* global state change in the store. When rendering lists or grids (e.g. `Carousel`, `SearchClient`), this creates an O(N) re-render bottleneck across the entire app whenever completely unrelated library state changes.
**Action:** Always use specific state selectors (`useAppLibraryStore(state => state.specificData)`) combined with `React.memo` when a component represents a list item connected to a global store to prevent cascading O(N) re-renders.
