'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const AndroidSeriesClientWrapper = dynamic(
  () => import('@/components/native/AndroidSeriesClientWrapper').then((mod) => mod.AndroidSeriesClientWrapper),
  { ssr: false, loading: () => <div className="p-4">Loading Series...</div> }
);

function SeriesLoader() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug');
  if (!slug) return <div className="p-4">Series slug is required.</div>;
  return <AndroidSeriesClientWrapper slug={slug} />;
}

export default function AndroidSeriesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <SeriesLoader />
    </Suspense>
  );
}
