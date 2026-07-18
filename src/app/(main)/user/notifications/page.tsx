import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { Bell } from 'lucide-react';
import { NotificationClient } from './NotificationClient';

export const metadata = {
  title: 'Notifications | REDBEARD',
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            Notifications
          </h1>
          <p className="mt-2 text-text-secondary">
            Stay updated on your favorite series and community replies.
          </p>
        </div>
      </div>

      <NotificationClient initialNotifications={notifications} />
    </div>
  );
}
