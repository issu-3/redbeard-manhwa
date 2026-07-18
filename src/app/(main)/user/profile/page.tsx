import { Metadata } from 'next';
import Image from 'next/image';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { 
  Trophy, 
  Flame, 
  BookOpen, 
  Star,
  Settings,
  Bookmark
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Profile | REDBEARD',
  description: 'Your user profile and statistics on REDBEARD',
};

async function getProfileData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bookmarks: true,
      readingHistory: true,
      ratings: true,
    }
  });
  
  return user;
}

export default async function ProfilePage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await getProfileData(session.user.id);
  
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border">
        {/* Banner */}
        <div className="h-32 md:h-48 w-full bg-gradient-to-r from-red-900 to-black relative">
          {user.bannerUrl && (
            <Image 
              src={user.bannerUrl} 
              alt="Profile Banner" 
              fill 
              className="object-cover opacity-50"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
        
        <div className="px-6 pb-6 -mt-12 md:-mt-16 relative flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-background overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.username || user.id}`}
              alt={user.username || user.displayName || 'User'}
              fill
              className="object-cover"
            />
          </div>
          
          <div className="flex-1 space-y-1 md:pb-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {user.displayName || user.username || 'Anonymous Reader'}
            </h1>
            <p className="text-muted-foreground">
              @{user.username || user.id.slice(0, 8)} • Lvl {user.level}
            </p>
          </div>
          
          <div className="md:pb-2">
            <Button asChild variant="outline">
              <Link href="/user/settings">
                <Settings className="w-4 h-4 mr-2" />
                Edit Profile
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Chapters Read</p>
            <p className="text-2xl font-bold">{user.readingHistory.length}</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Reading Streak</p>
            <p className="text-2xl font-bold">{user.readingStreak} Days</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Bookmarks</p>
            <p className="text-2xl font-bold">{user.bookmarks.length}</p>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Total XP</p>
            <p className="text-2xl font-bold">{user.xp.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Bio & Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">About Me</h2>
            {user.bio ? (
              <p className="text-muted-foreground whitespace-pre-wrap">{user.bio}</p>
            ) : (
              <p className="text-muted-foreground italic">This user hasn&apos;t written a bio yet.</p>
            )}
          </section>
          
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Star className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-lg font-medium">No recent activity</p>
              <p className="text-sm text-muted-foreground mt-1">
                Read some chapters or leave reviews to see them here!
              </p>
            </div>
          </section>
        </div>
        
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Achievements</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress to Lvl {user.level + 1}</span>
                <span className="font-medium">45%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-red-600 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            
            <div className="mt-6 flex flex-col gap-3">
              {/* Empty placeholder for achievements since we don't have UserAchievement data yet */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">First Blood</p>
                  <p className="text-xs text-muted-foreground">Read your first chapter</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
