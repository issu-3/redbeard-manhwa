'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

export function useInfiniteScroll(
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {}
) {
  const { threshold = 0.1, rootMargin = '200px', enabled = true } = options;
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (!node || !enabled) return;

      observerRef.current = new IntersectionObserver(
        async (entries) => {
          const [entry] = entries;
          if (entry.isIntersecting && !isLoading) {
            setIsLoading(true);
            try {
              await onLoadMore();
            } finally {
              setIsLoading(false);
            }
          }
        },
        { threshold, rootMargin }
      );

      observerRef.current.observe(node);
    },
    [onLoadMore, threshold, rootMargin, enabled, isLoading]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { loadMoreRef, isLoading };
}
