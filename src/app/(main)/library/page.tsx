import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const OfflineLibraryClient = dynamic(
  () => import('@/components/user/OfflineLibraryClient').then(mod => mod.OfflineLibraryClient),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'Offline Library | REDBEARD',
  description: 'Read your downloaded and imported chapters offline.',
};

export default function OfflineLibraryPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <OfflineLibraryClient />
    </div>
  );
}
