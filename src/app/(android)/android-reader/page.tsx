'use client';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const AndroidReaderView = dynamic(
  () => import('@/components/native/AndroidReaderView').then(mod => mod.AndroidReaderView),
  { ssr: false }
);

function AndroidReaderPageContent() {
  const searchParams = useSearchParams();
  const seriesSlug = searchParams.get('seriesSlug') || '';
  const chapterSlug = searchParams.get('chapterSlug') || '';
  const chapterId = searchParams.get('id') || searchParams.get('chapterId') || '';
  const seriesId = searchParams.get('seriesId') || '';
  
  return <AndroidReaderView seriesSlug={seriesSlug} chapterSlug={chapterSlug} chapterId={chapterId} seriesId={seriesId} />;
}

export default function AndroidReaderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-black">Loading...</div>}>
      <AndroidReaderPageContent />
    </Suspense>
  );
}
