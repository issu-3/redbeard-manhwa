'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAppLibraryStore } from '@/store/app-library-store';
import { LocalLibraryRepository } from '@/lib/local-library';
import { Capacitor } from '@capacitor/core';

export function LibrarySyncProvider() {
  const { data: session, status } = useSession();
  const store = useAppLibraryStore();
  
  // Track if we've already done the initial sync to avoid infinite loops on re-renders
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    // Only run this logic if on Native Android or specifically testing the app shell
    const isNative = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && navigator.userAgent.includes('RedbeardApp'));
    if (!isNative) return;

    const performSync = async () => {
      if (status === 'loading') return;

      // Offline-first startup path:
      // Try to load the user's library from local storage immediately, regardless of network status.
      // If we don't have a session yet (e.g. offline), try to use the last known user ID.
      let currentUserId = session?.user?.id;
      
      if (!currentUserId) {
        const lastUserId = await LocalLibraryRepository.getLastUserId();
        if (lastUserId) {
          currentUserId = lastUserId;
        }
      }

      // 1. Hydrate the local library into the UI immediately (Offline-First)
      if (currentUserId && !store.hasHydrated) {
        await store.hydrateLibrary(currentUserId);
      }

      // 2. If online and authenticated, sync with the server (Background Sync)
      if (status === 'authenticated' && currentUserId && !hasSyncedRef.current) {
        hasSyncedRef.current = true; // prevent multiple syncs in a single session
        try {
          const res = await fetch('/api/user/bookmarks/sync');
          if (res.ok) {
            const data = await res.json();
            if (data.series && Array.isArray(data.series)) {
              await store.syncWithServer(currentUserId, data.series);
            }
          }
        } catch (error) {
          console.error('[LibrarySyncProvider] Failed to sync with server:', error);
          // Crucially, DO NOT clear the local library if the network fails.
        }
      }
    };

    performSync();

  }, [session, status, store]);

  return null;
}
