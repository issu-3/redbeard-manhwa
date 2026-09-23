'use client';

import dynamic from 'next/dynamic';

const AndroidSeriesView = dynamic(
  () => import('@/components/native/AndroidSeriesView').then(mod => mod.AndroidSeriesView),
  { ssr: false }
);

export default function AndroidSeriesPage() {
  return <AndroidSeriesView />;
}
