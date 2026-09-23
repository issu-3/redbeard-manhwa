'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const AndroidSeriesClientWrapper = dynamic(
  () => import('@/components/native/AndroidSeriesClientWrapper').then(mod => mod.AndroidSeriesClientWrapper),
  { ssr: false }
);

function AndroidSeriesPageContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') || searchParams.get('id') || '';
  return <AndroidSeriesClientWrapper slug={slug} />;
}

export default function AndroidSeriesPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background">Loading...</div>}>
      <AndroidSeriesPageContent />
    </Suspense>
  );
}
