"use client";

import dynamic from 'next/dynamic';

export const AndroidLibraryClientWrapper = dynamic(
  () => import('@/components/native/AndroidLibraryView').then(mod => mod.AndroidLibraryView),
  { ssr: false }
);
