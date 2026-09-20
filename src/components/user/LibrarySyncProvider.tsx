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
      const isNative = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && navigator.userAgent.includes('RedbeardApp'));
      console.log(`[LIBRARY_DEBUG] platform = isNative:${isNative} | Capacitor.isNativePlatform():${Capacitor.isNativePlatform()} | userAgent:${typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined'}`);
      console.log(`[LIBRARY_DEBUG] session status = ${status}`);
      console.log(`[LIBRARY_DEBUG] session userId = ${session?.user?.id}`);
      console.log(`[LIBRARY_DEBUG] store activeUserId = ${store.activeUserId}`);
      console.log(`[LIBRARY_DEBUG] store hasHydrated = ${store.hasHydrated}`);

      // 1. Hydrate the local library into the UI immediately (Offline-First)
      if (!store.hasHydrated) {
        try {
          console.log('[LIBRARY_DEBUG] app startup = hydrating locally');
          let currentUserId = session?.user?.id;
          
          if (!currentUserId) {
            console.log('[LIBRARY_DEBUG] reading local storage for last user');
            const lastUserId = await LocalLibraryRepository.getLastUserId();
            console.log(`[LIBRARY_DEBUG] lastUserId = ${lastUserId}`);
            if (lastUserId) {
              currentUserId = lastUserId;
            }
          }

          if (currentUserId) {
            console.log('[LIBRARY_DEBUG] local storage read complete, hydrating user:', currentUserId);
            await store.hydrateLibrary(currentUserId);
          } else {
            console.log('[LIBRARY_DEBUG] no user found, marking hydration complete');
            store.setHasHydrated(true);
          }
          console.log('[LIBRARY_DEBUG] hydration complete, loading=false');
        } catch (error) {
          console.error('[LIBRARY_DEBUG] hydration error:', error);
          store.setHasHydrated(true);
        }
      }

      // 2. Background Sync (Server/Network dependent)
      if (status === 'loading') return;

      if (status === 'authenticated' && session?.user?.id) {
        if (store.activeUserId !== session.user.id) {
          console.log('[LIBRARY_DEBUG] user changed or just logged in, hydrating for:', session.user.id);
          await store.hydrateLibrary(session.user.id);
          return;
        }

        if (!hasSyncedRef.current) {
          hasSyncedRef.current = true;
          console.log('[LIBRARY_DEBUG] starting background sync');
          try {
            const res = await fetch('/api/user/bookmarks/sync');
            if (res.ok) {
              const data = await res.json();
              if (data.series && Array.isArray(data.series)) {
                await store.syncWithServer(session.user.id, data.series);
              }
            } else {
               console.log(`[LIBRARY_DEBUG] background sync fetch failed with status: ${res.status}`);
            }
            console.log('[LIBRARY_DEBUG] background sync complete');
          } catch (error) {
            console.error('[LIBRARY_DEBUG] Failed to sync with server:', error);
          }
        }
      } else if (status === 'unauthenticated') {
        console.log('[LIBRARY_DEBUG] offline detected = unauthenticated status');
      }
    };

    performSync();

  }, [session, status, store]);

  return null;
}
