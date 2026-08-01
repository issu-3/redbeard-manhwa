import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { prisma } from '@/lib/prisma';

const OLD_DB_URL = 'prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza195UzJDLVhiaW9xMWhMOTlnbFd5VWciLCJhcGlfa2V5IjoiMDFLWVk0NFk4QlpKU01WNTRWQ0JCVkVYODEiLCJ0ZW5hbnRfaWQiOiI4MDkxYmM3OGRiM2Q5ODM5NzdkMzg0MjJmOGI0MDBjZDY1Y2ZkYWI1ZGIwZDg1MjI0YzVjZjVjODgxY2Q3OTc3IiwiaW50ZXJuYWxfc2VjcmV0IjoiMTFiZDYzNzktODk3ZS00MGJkLTliMjUtYWE3NDAzY2Q5NGMxIn0.yO617mkKYmQQbB_xOmezOMisb61nUsfzfmK--t79Egs';

export const maxDuration = 60; // Allow up to 60 seconds for this route

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const step = searchParams.get('step') || 'audit';

  if (secret !== 'pagla-admin-seed-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Connect to old Prisma Postgres database
  const oldPrisma = new PrismaClient({
    datasources: {
      db: {
        url: OLD_DB_URL,
      },
    },
  }).$extends(withAccelerate());

  try {
    if (step === 'audit') {
      // Step 1: Just audit what's in the old database
      const results: Record<string, number> = {};

      const tables = [
        'user', 'genre', 'tag', 'author', 'artist', 'series',
        'chapter', 'chapterImage', 'bookmark', 'readingHistory',
        'readingList', 'review', 'comment', 'notification',
        'achievement', 'announcement', 'siteSetting',
        'heroBanner', 'homepageSection', 'viewLog', 'auditLog',
      ];

      for (const table of tables) {
        try {
          const count = await (oldPrisma as any)[table].count();
          results[table] = count;
        } catch (e: any) {
          results[table] = -1; // Error
        }
      }

      // Also count in new DB for comparison
      const newResults: Record<string, number> = {};
      for (const table of tables) {
        try {
          const count = await (prisma as any)[table].count();
          newResults[table] = count;
        } catch (e: any) {
          newResults[table] = -1;
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Audit complete',
        oldDatabase: results,
        newDatabase: newResults,
        missing: Object.fromEntries(
          Object.entries(results).filter(([key, val]) => val > (newResults[key] || 0))
            .map(([key, val]) => [key, { old: val, new: newResults[key] || 0, diff: val - (newResults[key] || 0) }])
        ),
      });
    }

    if (step === 'migrate') {
      // Step 2: Migrate missing data
      const log: string[] = [];

      // Migrate Genres
      const oldGenres = await (oldPrisma as any).genre.findMany();
      if (oldGenres.length > 0) {
        const res = await prisma.genre.createMany({ data: oldGenres, skipDuplicates: true });
        log.push(`Genres: migrated ${res.count} new records (${oldGenres.length} total in old DB)`);
      }

      // Migrate Tags
      const oldTags = await (oldPrisma as any).tag.findMany();
      if (oldTags.length > 0) {
        const res = await prisma.tag.createMany({ data: oldTags, skipDuplicates: true });
        log.push(`Tags: migrated ${res.count} new records`);
      }

      // Migrate Authors
      const oldAuthors = await (oldPrisma as any).author.findMany();
      if (oldAuthors.length > 0) {
        const res = await prisma.author.createMany({ data: oldAuthors, skipDuplicates: true });
        log.push(`Authors: migrated ${res.count} new records`);
      }

      // Migrate Artists
      const oldArtists = await (oldPrisma as any).artist.findMany();
      if (oldArtists.length > 0) {
        const res = await prisma.artist.createMany({ data: oldArtists, skipDuplicates: true });
        log.push(`Artists: migrated ${res.count} new records`);
      }

      // Migrate Users (needed for foreign keys)
      const oldUsers = await (oldPrisma as any).user.findMany();
      if (oldUsers.length > 0) {
        const res = await prisma.user.createMany({ data: oldUsers, skipDuplicates: true });
        log.push(`Users: migrated ${res.count} new records`);
      }

      // Migrate Series
      const oldSeries = await (oldPrisma as any).series.findMany();
      if (oldSeries.length > 0) {
        const res = await prisma.series.createMany({ data: oldSeries, skipDuplicates: true });
        log.push(`Series: migrated ${res.count} new records (${oldSeries.length} total in old DB)`);
      }

      // Migrate Chapters
      const oldChapters = await (oldPrisma as any).chapter.findMany();
      if (oldChapters.length > 0) {
        const batchSize = 200;
        let chapterCount = 0;
        for (let i = 0; i < oldChapters.length; i += batchSize) {
          const batch = oldChapters.slice(i, i + batchSize);
          const res = await prisma.chapter.createMany({ data: batch, skipDuplicates: true });
          chapterCount += res.count;
        }
        log.push(`Chapters: migrated ${chapterCount} new records (${oldChapters.length} total in old DB)`);
      }

      // Migrate ChapterImages
      const oldImages = await (oldPrisma as any).chapterImage.findMany();
      if (oldImages.length > 0) {
        const batchSize = 200;
        let imgCount = 0;
        for (let i = 0; i < oldImages.length; i += batchSize) {
          const batch = oldImages.slice(i, i + batchSize);
          const res = await prisma.chapterImage.createMany({ data: batch, skipDuplicates: true });
          imgCount += res.count;
        }
        log.push(`ChapterImages: migrated ${imgCount} new records (${oldImages.length} total in old DB)`);
      }

      // Migrate SiteSettings
      const oldSettings = await (oldPrisma as any).siteSetting.findMany();
      if (oldSettings.length > 0) {
        for (const setting of oldSettings) {
          await prisma.siteSetting.upsert({
            where: { key: setting.key },
            update: {},
            create: setting,
          });
        }
        log.push(`SiteSettings: processed ${oldSettings.length} records`);
      }

      // Migrate HeroBanners
      const oldBanners = await (oldPrisma as any).heroBanner.findMany();
      if (oldBanners.length > 0) {
        const res = await prisma.heroBanner.createMany({ data: oldBanners, skipDuplicates: true });
        log.push(`HeroBanners: migrated ${res.count} new records`);
      }

      // Migrate HomepageSections
      const oldSections = await (oldPrisma as any).homepageSection.findMany();
      if (oldSections.length > 0) {
        const res = await prisma.homepageSection.createMany({ data: oldSections, skipDuplicates: true });
        log.push(`HomepageSections: migrated ${res.count} new records`);
      }

      // Migrate Bookmarks
      const oldBookmarks = await (oldPrisma as any).bookmark.findMany();
      if (oldBookmarks.length > 0) {
        const res = await prisma.bookmark.createMany({ data: oldBookmarks, skipDuplicates: true });
        log.push(`Bookmarks: migrated ${res.count} new records`);
      }

      // Migrate Reviews
      const oldReviews = await (oldPrisma as any).review.findMany();
      if (oldReviews.length > 0) {
        const res = await prisma.review.createMany({ data: oldReviews, skipDuplicates: true });
        log.push(`Reviews: migrated ${res.count} new records`);
      }

      // Migrate Achievements
      const oldAchievements = await (oldPrisma as any).achievement.findMany();
      if (oldAchievements.length > 0) {
        const res = await prisma.achievement.createMany({ data: oldAchievements, skipDuplicates: true });
        log.push(`Achievements: migrated ${res.count} new records`);
      }

      // Migrate Announcements
      const oldAnnouncements = await (oldPrisma as any).announcement.findMany();
      if (oldAnnouncements.length > 0) {
        const res = await prisma.announcement.createMany({ data: oldAnnouncements, skipDuplicates: true });
        log.push(`Announcements: migrated ${res.count} new records`);
      }

      return NextResponse.json({
        success: true,
        message: 'Migration complete!',
        log,
      });
    }

    if (step === 'migrate-relations') {
      // Step 3: Migrate many-to-many join tables
      const log: string[] = [];

      const joinTables = [
        { name: '_GenreToSeries', colA: 'A', colB: 'B' },
        { name: '_SeriesToTag', colA: 'A', colB: 'B' },
        { name: '_AuthorToSeries', colA: 'A', colB: 'B' },
        { name: '_ArtistToSeries', colA: 'A', colB: 'B' },
      ];

      for (const table of joinTables) {
        try {
          const rows: any[] = await (oldPrisma as any).$queryRawUnsafe(`SELECT * FROM "${table.name}"`);
          log.push(`${table.name}: found ${rows.length} relationships in old DB`);
          
          if (rows.length > 0) {
            let count = 0;
            for (const row of rows) {
              try {
                await prisma.$executeRawUnsafe(
                  `INSERT INTO "${table.name}" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                  row.A,
                  row.B
                );
                count++;
              } catch (e) {
                // Skip conflicts
              }
            }
            log.push(`${table.name}: inserted ${count} relationships`);
          }
        } catch (e: any) {
          log.push(`${table.name}: error - ${e.message?.slice(0, 100)}`);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Relationship migration complete!',
        log,
      });
    }

    return NextResponse.json({ error: 'Unknown step. Use: audit, migrate, or migrate-relations' }, { status: 400 });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message, stack: error.stack?.slice(0, 500) }, { status: 500 });
  } finally {
    await (oldPrisma as any).$disconnect();
  }
}
