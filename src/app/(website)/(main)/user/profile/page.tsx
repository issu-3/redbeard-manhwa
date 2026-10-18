import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Trophy,
  Flame,
  BookOpen,
  Settings,
  Bookmark,
  Clock,
  Heart,
  Sparkles,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { calculateLevel } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Profile | REDBEARD',
  description: 'Your user profile and statistics on REDBEARD',
};

async function getProfileData(userId: string) {
  const [user, chaptersRead, bookmarksCount, recentlyRead, rawFavoriteGenres, userAchievements] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.readingHistory.count({
      where: { userId }
    }),
    prisma.bookmark.count({
      where: { userId }
    }),
    prisma.readingHistory.findMany({
      where: { userId },
      include: {
        series: true,
        chapter: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    }),
    prisma.$queryRaw<{ name: string, count: number }[]>`
      SELECT g.name, CAST(COUNT(*) AS INTEGER) as count
      FROM reading_history rh
      JOIN series s ON rh."seriesId" = s.id
      JOIN "_GenreToSeries" gs ON s.id = gs."B"
      JOIN genres g ON gs."A" = g.id
      WHERE rh."userId" = ${userId}
      GROUP BY g.id, g.name
      ORDER BY count DESC
      LIMIT 6
    `,
    prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: { unlockedAt: 'desc' },
      take: 6,
    }),
  ]);

  if (!user) return null;

  return {
    user,
    chaptersRead,
    bookmarksCount,
    recentlyRead,
    favoriteGenres: rawFavoriteGenres.map(g => ({ name: g.name, count: Number(g.count) })),
    userAchievements,
  };
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const profileData = await getProfileData(session.user.id);

  if (!profileData) {
    redirect('/login');
  }

  const { user, chaptersRead, bookmarksCount, recentlyRead, favoriteGenres, userAchievements } = profileData;

  // Calculate dynamic level progress from real user XP (safeguarded against negative values)
  const levelInfo = calculateLevel(Math.max(0, user.xp || 0));
  const displayLevel = Math.max(user.level || 1, levelInfo.level);
  const progressPercent = Math.min(100, Math.max(0, Math.round(levelInfo.progress)));

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-sm">
        {/* Banner with subtle dark-red gradient */}
        <div className="h-28 sm:h-36 md:h-44 w-full bg-linear-to-r from-red-950/70 via-zinc-950 to-zinc-900 relative">
          {user.bannerUrl && (
            <Image
              src={user.bannerUrl}
              alt="Profile Banner"
              fill
              className="object-cover opacity-40"
              priority
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-card via-card/40 to-transparent" />
        </div>

        {/* Header Content */}
        <div className="px-4 sm:px-6 pb-5 pt-0 -mt-10 sm:-mt-14 relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 text-center sm:text-left">
          {/* Avatar and Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3.5 sm:gap-5 min-w-0">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-card bg-muted shadow-md overflow-hidden shrink-0">
              <Image
                src={user.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${user.id}`}
                alt={user.displayName || user.username || 'User'}
                fill
                className="object-cover"
                priority
              />
            </div>

            <div className="space-y-1 min-w-0 sm:pb-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground truncate">
                {user.displayName || user.username || 'Anonymous Reader'}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm text-muted-foreground">
                <span>@{user.username || user.id.slice(0, 8)}</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  Lvl {displayLevel}
                </span>
                {user.role !== 'USER' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    {user.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="sm:pb-1 shrink-0">
            <Button asChild variant="outline" size="sm" className="h-9 px-4 gap-2 border-border/80 hover:bg-muted">
              <Link href="/user/settings">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Edit Profile</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
        {/* Chapters Read */}
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <BookOpen className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight truncate">Chapters Read</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight mt-0.5">{chaptersRead.toLocaleString()}</p>
          </div>
        </div>

        {/* Reading Streak */}
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
            <Flame className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight truncate">Reading Streak</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight mt-0.5">
              {user.readingStreak} {user.readingStreak === 1 ? 'Day' : 'Days'}
            </p>
          </div>
        </div>

        {/* Bookmarks */}
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
            <Bookmark className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight truncate">Bookmarks</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight mt-0.5">{bookmarksCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Total XP */}
        <div className="bg-card border border-border rounded-xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3.5 transition-colors">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <Trophy className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs text-muted-foreground font-medium leading-tight truncate">Total XP</p>
            <p className="text-lg sm:text-2xl font-bold text-foreground tracking-tight mt-0.5">{user.xp.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Activity & Bio) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recently Read Section */}
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">Recently Read</h2>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                <Link href="/user/history" className="flex items-center gap-1">
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>

            {recentlyRead.length > 0 ? (
              <div className="space-y-3">
                {recentlyRead.map((item) => {
                  const safeSlug = typeof item.chapter.slug === 'string' && item.chapter.slug.trim()
                    ? item.chapter.slug
                    : item.chapter.number != null ? String(item.chapter.number) : null;

                  if (!safeSlug && item.chapter.sourceType !== 'DOWNLOAD' && item.chapter.sourceType !== 'EXTERNAL') {
                    return null;
                  }

                  const isExternalOrDownload = ['DOWNLOAD', 'EXTERNAL'].includes(item.chapter.sourceType as string);
                  const href = item.chapter.sourceType === 'DOWNLOAD' && item.chapter.downloadUrl
                    ? item.chapter.downloadUrl
                    : `/series/${item.series.slug}/chapter/${safeSlug}`;

                  return (
                    <Link
                      key={item.id}
                      href={href}
                      prefetch={false}
                      target={isExternalOrDownload ? '_blank' : undefined}
                      rel={isExternalOrDownload ? 'noopener noreferrer' : undefined}
                      className="group flex items-center gap-3.5 p-2.5 sm:p-3 rounded-xl bg-muted/20 hover:bg-muted/50 border border-border/40 hover:border-border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {/* Series Cover */}
                      <div className="relative w-12 h-16 sm:w-14 sm:h-18 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/50">
                        {item.series.coverImage ? (
                          <Image
                            src={item.series.coverImage}
                            alt={item.series.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Series & Chapter Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                          {item.series.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-primary font-medium truncate mt-0.5">
                          {item.chapter.label || `Chapter ${item.chapter.number}`}
                          {item.chapter.title ? ` • ${item.chapter.title}` : ''}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                          </span>
                          {isExternalOrDownload && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                              <ExternalLink className="w-2.5 h-2.5" />
                              {item.chapter.sourceType}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl bg-muted/10 border border-dashed border-border/60">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6 text-muted-foreground opacity-60" />
                </div>
                <p className="text-sm font-medium text-foreground">No reading history yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Chapters you read will appear here so you can pick up right where you left off.
                </p>
                <Button variant="outline" size="sm" asChild className="mt-4 text-xs">
                  <Link href="/browse">Explore Series</Link>
                </Button>
              </div>
            )}
          </section>

          {/* About Me Section */}
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base sm:text-lg font-bold text-foreground">About Me</h2>
              {!user.bio && (
                <Link href="/user/settings" className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs">
                  Add Bio
                </Link>
              )}
            </div>
            {user.bio ? (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {user.bio}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                This reader hasn&apos;t written a bio yet.
              </p>
            )}
          </section>
        </div>

        {/* Right Column (Progression, Genres, Achievements) */}
        <div className="space-y-6">
          {/* Dynamic Level & Progress */}
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">Level & Progress</h2>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Lvl {displayLevel}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">Progress to Lvl {displayLevel + 1}</span>
                <span className="font-semibold text-foreground">{progressPercent}%</span>
              </div>

              {/* Dynamic Progress Bar */}
              <div className="h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-linear-to-r from-primary to-red-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <span>{levelInfo.currentXp.toLocaleString()} XP</span>
                <span>{levelInfo.requiredXp.toLocaleString()} XP next</span>
              </div>
            </div>
          </section>

          {/* Favorite Genres */}
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-primary" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">Favorite Genres</h2>
            </div>

            {favoriteGenres.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {favoriteGenres.map((genre) => (
                  <div
                    key={genre.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border/60 text-xs font-medium text-foreground transition-colors"
                  >
                    <span>{genre.name}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold px-1 py-0.5 bg-background/50 rounded">
                      {genre.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Read series across different genres to discover and establish your favorites here.
              </p>
            )}
          </section>

          {/* Achievements (Honest State) */}
          <section className="bg-card border border-border rounded-xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h2 className="text-base sm:text-lg font-bold text-foreground">Achievements</h2>
            </div>

            {userAchievements && userAchievements.length > 0 ? (
              <div className="space-y-2.5">
                {userAchievements.map((ua) => (
                  <div
                    key={ua.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {ua.achievement.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        {ua.achievement.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 px-4 rounded-xl bg-muted/20 border border-dashed border-border/60">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2.5 text-muted-foreground">
                  <Trophy className="w-5 h-5 opacity-50" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">No achievements yet</p>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-[210px] mx-auto leading-relaxed">
                  Keep reading chapters, growing your streak, and exploring genres to earn achievements.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
