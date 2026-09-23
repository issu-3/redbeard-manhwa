'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const AndroidReaderView = dynamic(
  () => import('@/components/native/AndroidReaderView').then((mod) => mod.AndroidReaderView),
  { ssr: false, loading: () => <div className="p-4">Loading Reader...</div> }
);

function ReaderLoader() {
  const searchParams = useSearchParams();
  const seriesSlug = searchParams.get('seriesSlug');
  const chapterSlug = searchParams.get('chapterSlug');
  const chapterId = searchParams.get('id');
  const seriesId = searchParams.get('seriesId');

  if (!chapterId || !seriesId || !seriesSlug || !chapterSlug) {
    return <div className="p-4">Chapter ID and Series ID are required for offline reading.</div>;
  }

  return (
    <AndroidReaderView 
      seriesSlug={seriesSlug} 
      chapterSlug={chapterSlug} 
      chapterId={chapterId}
      seriesId={seriesId}
    />
  );
}

export default function AndroidReaderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-black text-white">Loading reader...</div>}>
      <ReaderLoader />
    </Suspense>
  );
}
