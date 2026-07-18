import { Metadata } from 'next';
import Image from 'next/image';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Save, User, Mail, Link as LinkIcon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
        {/* Profile Form (Mock) */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Public Profile</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Username</label>
                <Input defaultValue={user.username || ''} placeholder="redbeard_fan" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Display Name</label>
                <Input defaultValue={user.displayName || user.username || ''} placeholder="Redbeard Fan" />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Bio</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue={user.bio || ''} 
                  placeholder="Tell us about yourself..." 
                />
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full border-2 border-border overflow-hidden bg-muted relative group cursor-pointer">
                <img 
                  src={user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.id}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white mb-1" />
                  <span className="text-xs text-white font-medium">Change</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                JPG, GIF or PNG. Max size of 2MB.
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button>
              <Save className="w-4 h-4 mr-2" />
              Save Profile
            </Button>
          </div>
        </section>

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
