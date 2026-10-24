
## 2025-05-18 - Zustand Selector Pattern for High-Volume List Items
**Learning:** Using `const store = useAppLibraryStore()` without a selector in a heavily used component like `SeriesCard` subscribes that component to *every* global state change in the store. When rendering lists or grids (e.g. `Carousel`, `SearchClient`), this creates an O(N) re-render bottleneck across the entire app whenever completely unrelated library state changes.
**Action:** Always use specific state selectors (`useAppLibraryStore(state => state.specificData)`) combined with `React.memo` when a component represents a list item connected to a global store to prevent cascading O(N) re-renders.

## 2025-05-18 - Zustand Selector Pattern to Prevent Cascading Re-renders
**Learning:** Destructuring state from Zustand stores (e.g., `const { data } = useStore()`) causes the component to subscribe to the entire store. When this is done in components used frequently or globally (like `BookmarkButton`, `AndroidLibraryView`, etc.), any update to unrelated store state triggers widespread re-renders. This is a common performance anti-pattern that creates O(N) re-renders across the app.
**Action:** Always use atomic selectors (e.g., `const data = useStore(state => state.data)`) instead of destructuring when consuming global state, especially in list items or widely used components.
