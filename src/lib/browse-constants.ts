// Client-safe browse constants/types. This module must never import server
// code (prisma, next/cache): BrowseGrid is a client component and imports
// from here, while the server data layer lives in browse-categories.ts.

export const BROWSE_PAGE_SIZE = 24;

export type BrowseCategory =
  | 'trending'
  | 'popular'
  | 'completed'
  | 'ongoing'
  | 'new-releases'
  | 'latest';
