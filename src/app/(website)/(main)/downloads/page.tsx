import { Metadata } from 'next';
import { AndroidDownloadQueueView } from '@/components/native/AndroidDownloadQueueView';

export const metadata: Metadata = {
  title: 'Downloads',
};

export default function DownloadsPage() {
  return <AndroidDownloadQueueView />;
}
