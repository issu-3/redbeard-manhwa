'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { toast } from 'sonner';

export function NetworkListener() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let isRedirecting = false;
    let toastId: string | number | undefined;

    const handleOffline = () => {
      if (isRedirecting) return;
      isRedirecting = true;
      
      // Check if we are currently on the remote site
      if (window.location.origin.includes('redbeard.store')) {
        toastId = toast.error('Network connection lost.', {
          description: 'Redirecting to Offline Library...',
          duration: 3000,
        });
        
        setTimeout(() => {
          window.location.replace('/library');
        }, 1500);
      }
    };

    // 1. Listen for hardware network status changes (e.g., Wi-Fi turned off)
    const listener = Network.addListener('networkStatusChange', (status: any) => {
      if (!status.connected) {
        handleOffline();
      }
    });

    // 2. Listen for silent network drops (e.g., Wi-Fi connected but internet broken)
    // Next.js client-side navigation or API calls will throw a TypeError: Failed to fetch
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason instanceof TypeError && 
        (event.reason.message.includes('Failed to fetch') || event.reason.message.includes('NetworkError'))
      ) {
        handleOffline();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      listener.then((l: any) => l.remove());
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
