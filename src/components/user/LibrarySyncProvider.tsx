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
      // 1. Hydrate the local library into the UI immediately (Offline-First)
      // This MUST NOT wait for next-auth to finish loading the session, because
      // next-auth's session fetch will hang or fail when offline.
      if (!store.hasHydrated) {
        try {
          console.log('[Library] starting local hydration');
          let currentUserId = session?.user?.id;
          
          if (!currentUserId) {
            console.log('[Library] reading local storage for last user');
            const lastUserId = await LocalLibraryRepository.getLastUserId();
            if (lastUserId) {
              currentUserId = lastUserId;
            }
          }

          if (currentUserId) {
            console.log('[Library] local storage read complete, hydrating user:', currentUserId);
            await store.hydrateLibrary(currentUserId);
          } else {
            console.log('[Library] no user found, marking hydration complete');
            store.setHasHydrated(true);
          }
          console.log('[Library] hydration complete, loading=false');
        } catch (error) {
          console.error('[Library] hydration error:', error);
          store.setHasHydrated(true);
        }
      }

      // 2. Background Sync (Server/Network dependent)
      // Only proceed if next-auth has finished deciding the authentication state.
      if (status === 'loading') return;

      if (status === 'authenticated' && session?.user?.id && !hasSyncedRef.current) {
        hasSyncedRef.current = true; // prevent multiple syncs in a single session
        console.log('[Library] starting background sync');
        try {
          const res = await fetch('/api/user/bookmarks/sync');
          if (res.ok) {
            const data = await res.json();
            if (data.series && Array.isArray(data.series)) {
              await store.syncWithServer(session.user.id, data.series);
            }
          }
          console.log('[Library] background sync complete');
        } catch (error) {
          console.error('[Library] Failed to sync with server:', error);
          // Crucially, DO NOT clear the local library if the network fails.
        }
      }
    };

    performSync();

  }, [session, status, store]);

  return null;
}
