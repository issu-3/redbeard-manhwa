'use client';

import * as React from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback((callback: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', callback);
    return () => media.removeEventListener('change', callback);
  }, [query]);

  const getSnapshot = React.useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = () => false;

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}
