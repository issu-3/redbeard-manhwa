'use client';

import dynamic from 'next/dynamic';

const AndroidReaderView = dynamic(
  () => import('@/components/native/AndroidReaderView').then(mod => mod.AndroidReaderView),
  { ssr: false }
);

export default function AndroidReaderPage() {
  return <AndroidReaderView />;
}
