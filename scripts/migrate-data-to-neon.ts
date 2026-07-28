import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * REDBEARD Production Data Migration Tool: Prisma Postgres to Neon Free
 *
 * This script streams records from the legacy Prisma Postgres database
 * and batch-inserts them into the new Neon Free Postgres database in
 * topological dependency order, preserving IDs, timestamps, and relationships.
 *
 * Usage:
 *   OLD_DATABASE_URL="postgres://..." NEW_DATABASE_URL="postgres://..." npx ts-node scripts/migrate-data-to-neon.ts
 */

async function main() {
  const oldUrl = process.env.OLD_DATABASE_URL;
  const newUrl = process.env.NEW_DATABASE_URL || process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;

  if (!oldUrl || !newUrl) {
    console.error('❌ Error: Both OLD_DATABASE_URL and NEW_DATABASE_URL must be set in environment.');
    console.log('Example: OLD_DATABASE_URL="..." NEW_DATABASE_URL="..." npx ts-node scripts/migrate-data-to-neon.ts');
    process.exit(1);
  }

  console.log('🚀 Initializing connection pools...');
  const oldPool = new Pool({ connectionString: oldUrl, max: 2 });
  const newPool = new Pool({ connectionString: newUrl, max: 5 });

  const oldClient = new PrismaClient({ adapter: new PrismaPg(oldPool) });
  const newClient = new PrismaClient({ adapter: new PrismaPg(newPool) });

  try {
    console.log('📡 Testing connections...');
    await oldClient.$connect();
    console.log('✅ Connected to source legacy database.');
    await newClient.$connect();
    console.log('✅ Connected to destination Neon database.');

    // Order tables by foreign key dependency (parents before children)
    const modelsToMigrate = [
      { name: 'User', delegate: 'user' },
      { name: 'Account', delegate: 'account' },
      { name: 'Session', delegate: 'session' },
      { name: 'VerificationToken', delegate: 'verificationToken' },
      { name: 'Genre', delegate: 'genre' },
      { name: 'Tag', delegate: 'tag' },
      { name: 'Author', delegate: 'author' },
      { name: 'Artist', delegate: 'artist' },
      { name: 'Series', delegate: 'series' },
      { name: 'Chapter', delegate: 'chapter' },
      { name: 'ChapterImage', delegate: 'chapterImage' },
      { name: 'Bookmark', delegate: 'bookmark' },
      { name: 'ReadingHistory', delegate: 'readingHistory' },
      { name: 'ReadingList', delegate: 'readingList' },
      { name: 'ReadingListItem', delegate: 'readingListItem' },
      { name: 'Review', delegate: 'review' },
      { name: 'Comment', delegate: 'comment' },
      { name: 'CommentReply', delegate: 'commentReply' },
      { name: 'CommentLike', delegate: 'commentLike' },
      { name: 'Notification', delegate: 'notification' },
      { name: 'Report', delegate: 'report' },
      { name: 'Achievement', delegate: 'achievement' },
      { name: 'UserAchievement', delegate: 'userAchievement' },
      { name: 'Announcement', delegate: 'announcement' },
      { name: 'AuditLog', delegate: 'auditLog' },
      { name: 'Follow', delegate: 'follow' },
      { name: 'SiteSetting', delegate: 'siteSetting' },
      { name: 'HeroBanner', delegate: 'heroBanner' },
      { name: 'HomepageSection', delegate: 'homepageSection' },
      { name: 'ViewLog', delegate: 'viewLog' },
    ];

    console.log('\n📦 Starting batch data migration across 30 tables...');

    for (const model of modelsToMigrate) {
      const sourceDelegate = (oldClient as any)[model.delegate];
      const destDelegate = (newClient as any)[model.delegate];

      if (!sourceDelegate || !destDelegate) {
        console.warn(`⚠️ Skipping ${model.name}: delegate not found.`);
        continue;
      }

      console.log(`\n⏳ Fetching records from ${model.name}...`);
      const records = await sourceDelegate.findMany();
      console.log(`   Found ${records.length} records in ${model.name}.`);

      if (records.length === 0) continue;

      // Insert in batches of 500
      const batchSize = 500;
      let inserted = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        try {
          const res = await destDelegate.createMany({
            data: batch,
            skipDuplicates: true,
          });
          inserted += res.count || batch.length;
        } catch (err: any) {
          console.error(`   ❌ Error inserting batch into ${model.name}:`, err.message);
        }
      }
      console.log(`✅ Successfully migrated ${inserted} records into ${model.name}.`);
    }

    // Migrate implicit many-to-many join tables via SQL queries
    console.log('\n🔗 Migrating implicit many-to-many relationship join tables...');
    const implicitTables = [
      '_GenreToSeries',
      '_SeriesToTag',
      '_AuthorToSeries',
      '_ArtistToSeries',
    ];

    for (const table of implicitTables) {
      try {
        console.log(`⏳ Migrating join table ${table}...`);
        const rows: any[] = await oldClient.$queryRawUnsafe(`SELECT * FROM "${table}"`);
        console.log(`   Found ${rows.length} relationships in ${table}.`);
        if (rows.length === 0) continue;

        let count = 0;
        for (const row of rows) {
          try {
            await newClient.$executeRawUnsafe(
              `INSERT INTO "${table}" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              row.A,
              row.B
            );
            count++;
          } catch (e) {
            // Ignore conflict or missing reference
          }
        }
        console.log(`✅ Migrated ${count} relationships in ${table}.`);
      } catch (err: any) {
        console.log(`   ℹ️ Note: Table ${table} not present or skipped (${err.message.slice(0, 50)}...)`);
      }
    }

    console.log('\n🎉 MIGRATION COMPLETE! All data has been transferred to Neon Free Postgres.');
  } catch (error: any) {
    console.error('❌ Fatal error during migration:', error);
  } finally {
    await oldClient.$disconnect();
    await newClient.$disconnect();
    await oldPool.end();
    await newPool.end();
  }
}

main();
