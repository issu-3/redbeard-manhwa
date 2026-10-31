
## 2025-05-18 - Zustand Selector Pattern for High-Volume List Items
**Learning:** Using `const store = useAppLibraryStore()` without a selector in a heavily used component like `SeriesCard` subscribes that component to *every* global state change in the store. When rendering lists or grids (e.g. `Carousel`, `SearchClient`), this creates an O(N) re-render bottleneck across the entire app whenever completely unrelated library state changes.
**Action:** Always use specific state selectors (`useAppLibraryStore(state => state.specificData)`) combined with `React.memo` when a component represents a list item connected to a global store to prevent cascading O(N) re-renders.

## 2025-05-19 - Zustand Store Partial Subscription Optimization
**Learning:** Destructuring variables from `useAppLibraryStore()` without using Zustand selector functions (`state => state.variable`) effectively subscribes the component to every single state change in the store, causing full-app O(N) re-renders for every small update (especially on lists/grids).
**Action:** Always fetch specific pieces of state using atomic selectors (e.g. `useAppLibraryStore(state => state.hasHydrated)`) and invoke actions inside these selectors or via `useAppLibraryStore.getState()` to prevent unneeded re-renders.
