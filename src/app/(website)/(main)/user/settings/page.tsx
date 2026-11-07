import { Metadata } from 'next';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = {
  title: 'Account Settings | REDBEARD',
  description: 'Manage your account settings',
};

async function getUserSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  return user;
}

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await getUserSettings(session.user.id);
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </div>

      <div className="space-y-8">
        <ProfileForm user={user} />

        {/* Account Details */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Account Details</h2>
          </div>
          
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <Input defaultValue={user.email || ''} disabled />
            </div>
          </div>
        </section>
        
      </div>
    </div>
  );
}
