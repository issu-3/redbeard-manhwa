'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App as CapacitorApp } from '@capacitor/app';
import { initSQLiteDB } from '@/lib/sqlite/connection';

// Global state to hold the active user ID on native.
// Since Android is NO-LOGIN, this is always a persistent device-generated guest ID.
export let nativeUserId: string | null = null;

const DEVICE_USER_KEY = 'device_user_id';

/**
 * Generate or retrieve a persistent device-local user ID.
 * This ID survives app restarts and is unique per device installation.
 * Prefixed with "dev_" to distinguish from server-issued user IDs.
 */
async function getOrCreateDeviceUserId(): Promise<string> {
  const { value } = await Preferences.get({ key: DEVICE_USER_KEY });
  if (value) return value;

  // First launch: generate a stable device-local UUID
  const newId = `dev_${crypto.randomUUID()}`;
  await Preferences.set({ key: DEVICE_USER_KEY, value: newId });
  console.log('[NativeInit] Created new device user ID:', newId);
  return newId;
}

export function NativeInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    async function setupNative() {
      if (!Capacitor.isNativePlatform()) {
        setIsInitializing(false);
        return;
      }

      // Mark the HTML element so CSS native-hidden / native-only rules work
      document.documentElement.classList.add('is-native');

      // Setup hardware back button handler
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // 1. If keyboard is open, close it and return
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          (document.activeElement as HTMLElement).blur();
          return;
        }

        // 2. Dispatch a custom event to allow overlays or local state to consume the back press
        const backEvent = new CustomEvent('hardwareBackPress', { cancelable: true });
        document.dispatchEvent(backEvent);

        if (backEvent.defaultPrevented) {
          // Handled by an overlay (e.g., bottom sheet, tab change)
          return;
        }

        // 3. Navigate back or exit app
        if (window.location.pathname === '/android-app' || window.location.pathname === '/') {
          CapacitorApp.exitApp();
        } else if (canGoBack || window.history.length > 1) {
          window.history.back();
        } else {
          CapacitorApp.exitApp();
        }
      });

      try {
        await initSQLiteDB();
        console.log('[NativeInit] SQLite initialized');
        console.log('[REDBEARD_PERSIST] DB_INIT_COMPLETE');

        // Always use the persistent device-local ID for Android no-login architecture
        const deviceId = await getOrCreateDeviceUserId();
        nativeUserId = deviceId;
        console.log('[NativeInit] Using device guest userId:', nativeUserId);
        console.log(`[REDBEARD_PERSIST] RESTART_CHECK userId=${nativeUserId}`);
        
        // Hydrate local library
        console.log('[NativeInit] Hydrating local library for:', nativeUserId);
        const { useAppLibraryStore } = await import('@/store/app-library-store');
        await useAppLibraryStore.getState().hydrateLibrary(nativeUserId);
        console.log('[NativeInit] Library hydration complete');
        
      } catch (error) {
        console.error('[NativeInit] Failed to initialize:', error);
        // Even on error, try to get a device ID so the app doesn't break
        try {
          const deviceId = await getOrCreateDeviceUserId();
          nativeUserId = deviceId;
          const { useAppLibraryStore } = await import('@/store/app-library-store');
          useAppLibraryStore.getState().setHasHydrated(true); // unblock UI
        } catch {
          // Last resort: generate an in-memory ID (won't persist but app won't crash)
          nativeUserId = `dev_fallback_${Date.now()}`;
          const { useAppLibraryStore } = await import('@/store/app-library-store');
          useAppLibraryStore.getState().setHasHydrated(true); // unblock UI
        }
      }

      // Finish initializing
      setIsInitializing(false);
    }

    setupNative();
  }, []);

  if (isInitializing && Capacitor.isNativePlatform()) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
