import { Metadata } from 'next';
import Image from 'next/image';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Mail, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileForm } from './ProfileForm';

export const metadata: Metadata = {
  title: 'Account Settings | REDBEARD',
  description: 'Manage your account settings',
};

async function getUserSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: true,
    }
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

  const isGoogleConnected = user.accounts.some(a => a.provider === 'google');
  const isDiscordConnected = user.accounts.some(a => a.provider === 'discord');

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, preferences, and connected accounts.
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
              <p className="text-xs text-muted-foreground mt-1.5">
                Your email address is managed through your connected social accounts.
              </p>
            </div>
          </div>
        </section>
        
        {/* Connected Accounts */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <LinkIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Connected Accounts</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center relative">
                  <Image src="https://www.svgrepo.com/show/475656/google-color.svg" fill className="p-2 object-contain" alt="Google" />
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-xs text-muted-foreground">
                    {isGoogleConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <Button variant={isGoogleConnected ? "outline" : "default"} disabled={isGoogleConnected}>
                {isGoogleConnected ? 'Connected' : 'Connect'}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center relative">
                  <Image src="https://www.svgrepo.com/show/353655/discord-icon.svg" fill className="p-2 object-contain brightness-0 invert" alt="Discord" />
                </div>
                <div>
                  <p className="font-medium">Discord</p>
                  <p className="text-xs text-muted-foreground">
                    {isDiscordConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <Button variant={isDiscordConnected ? "outline" : "default"} disabled={isDiscordConnected}>
                {isDiscordConnected ? 'Connected' : 'Connect'}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
