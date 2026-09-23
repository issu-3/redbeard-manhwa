"use client";

import dynamic from 'next/dynamic';

export const OfflineLibraryClient = dynamic(
  () => import('@/components/user/OfflineLibraryClient').then(mod => mod.OfflineLibraryClient),
  { ssr: false }
);
