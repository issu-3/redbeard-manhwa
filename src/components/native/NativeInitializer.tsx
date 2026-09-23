'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
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

      try {
        await initSQLiteDB();
        console.log('[NativeInit] SQLite initialized');

        // Always use the persistent device-local ID for Android no-login architecture
        const deviceId = await getOrCreateDeviceUserId();
        nativeUserId = deviceId;
        console.log('[NativeInit] Using device guest userId:', nativeUserId);
        
      } catch (error) {
        console.error('[NativeInit] Failed to initialize:', error);
        // Even on error, try to get a device ID so the app doesn't break
        try {
          const deviceId = await getOrCreateDeviceUserId();
          nativeUserId = deviceId;
        } catch {
          // Last resort: generate an in-memory ID (won't persist but app won't crash)
          nativeUserId = `dev_fallback_${Date.now()}`;
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
