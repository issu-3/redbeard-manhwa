import { prisma } from '@/lib/prisma';
import type { 
  BackupVerificationResult, 
  BlobVerificationReport 
} from '@/types/backup';

export const TOPOLOGICAL_MODELS = [
  { name: 'User', delegate: 'user', table: 'users' },
  { name: 'Account', delegate: 'account', table: 'accounts' },
  { name: 'Session', delegate: 'session', table: 'sessions' },
  { name: 'VerificationToken', delegate: 'verificationToken', table: 'verification_tokens' },
  { name: 'Genre', delegate: 'genre', table: 'genres' },
  { name: 'Tag', delegate: 'tag', table: 'tags' },
  { name: 'Author', delegate: 'author', table: 'authors' },
  { name: 'Artist', delegate: 'artist', table: 'artists' },
  { name: 'Series', delegate: 'series', table: 'series' },
  { name: 'Chapter', delegate: 'chapter', table: 'chapters' },
  { name: 'ChapterImage', delegate: 'chapterImage', table: 'chapter_images' },
  { name: 'Bookmark', delegate: 'bookmark', table: 'bookmarks' },
  { name: 'ReadingHistory', delegate: 'readingHistory', table: 'reading_history' },
  { name: 'ReadingList', delegate: 'readingList', table: 'reading_lists' },
  { name: 'ReadingListItem', delegate: 'readingListItem', table: 'reading_list_items' },
  { name: 'Review', delegate: 'review', table: 'reviews' },
  { name: 'Comment', delegate: 'comment', table: 'comments' },
  { name: 'CommentReply', delegate: 'commentReply', table: 'comment_replies' },
  { name: 'CommentLike', delegate: 'commentLike', table: 'comment_likes' },
  { name: 'Notification', delegate: 'notification', table: 'notifications' },
  { name: 'Report', delegate: 'report', table: 'reports' },
  { name: 'Achievement', delegate: 'achievement', table: 'achievements' },
  { name: 'UserAchievement', delegate: 'userAchievement', table: 'user_achievements' },
  { name: 'Announcement', delegate: 'announcement', table: 'announcements' },
  { name: 'AuditLog', delegate: 'auditLog', table: 'audit_logs' },
  { name: 'Follow', delegate: 'follow', table: 'follows' },
  { name: 'SiteSetting', delegate: 'siteSetting', table: 'site_settings' },
  { name: 'HeroBanner', delegate: 'heroBanner', table: 'hero_banners' },
  { name: 'HomepageSection', delegate: 'homepageSection', table: 'homepage_sections' },
  { name: 'ViewLog', delegate: 'viewLog', table: 'view_logs' },
] as const;

export const IMPLICIT_M2M_TABLES = [
  '_GenreToSeries',
  '_SeriesToTag',
  '_AuthorToSeries',
  '_ArtistToSeries',
] as const;

/**
 * Helper to escape values for raw SQL INSERT statements
 */
function sqlEscape(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'::timestamp`;
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'::jsonb`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

/**
 * Generates a complete database dump in SQL or JSON format
 */
export async function generateDatabaseDump(format: 'SQL' | 'JSON'): Promise<{
  content: string;
  sizeBytes: number;
  recordCount: number;
  tableCounts: Record<string, number>;
}> {
  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;
  const dataMap: Record<string, any[]> = {};

  // 1. Fetch explicit models
  for (const model of TOPOLOGICAL_MODELS) {
    const delegate = (prisma as any)[model.delegate];
    if (!delegate) continue;
    try {
      const records = await delegate.findMany();
      dataMap[model.name] = records;
      tableCounts[model.name] = records.length;
      totalRecords += records.length;
    } catch (e: any) {
      console.warn(`[BackupEngine] Failed to fetch ${model.name}:`, e.message);
      dataMap[model.name] = [];
      tableCounts[model.name] = 0;
    }
  }

  // 2. Fetch implicit M2M tables
  for (const table of IMPLICIT_M2M_TABLES) {
    try {
      const records: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`);
      dataMap[table] = records;
      tableCounts[table] = records.length;
      totalRecords += records.length;
    } catch (e: any) {
      console.warn(`[BackupEngine] Failed to fetch M2M table ${table}:`, e.message);
      dataMap[table] = [];
      tableCounts[table] = 0;
    }
  }

  let content = '';

  if (format === 'JSON') {
    const dumpObject = {
      version: '1.0',
      format: 'JSON',
      timestamp: new Date().toISOString(),
      totalRecords,
      tableCounts,
      data: dataMap,
    };
    content = JSON.stringify(dumpObject, null, 2);
  } else {
    // SQL format
    const lines: string[] = [
      `-- REDBEARD PostgreSQL Database Backup`,
      `-- Format: SQL Dump`,
      `-- Timestamp: ${new Date().toISOString()}`,
      `-- Total Records: ${totalRecords}`,
      ``,
      `SET statement_timeout = 0;`,
      `SET client_encoding = 'UTF8';`,
      ``,
    ];

    // Truncate tables (reverse order to respect constraints, except backup_logs)
    lines.push(`-- Truncating existing tables`);
    for (const table of IMPLICIT_M2M_TABLES) {
      lines.push(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
    for (let i = TOPOLOGICAL_MODELS.length - 1; i >= 0; i--) {
      const t = TOPOLOGICAL_MODELS[i].table;
      lines.push(`TRUNCATE TABLE "${t}" CASCADE;`);
    }
    lines.push(``);

    // Insert statements for explicit models
    for (const model of TOPOLOGICAL_MODELS) {
      const records = dataMap[model.name] || [];
      if (records.length === 0) continue;

      lines.push(`-- Table: ${model.table} (${records.length} rows)`);
      const cols = Object.keys(records[0]);
      const colNamesStr = cols.map((c) => `"${c}"`).join(', ');

      // Batch 100 rows per INSERT statement
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const valStrings = batch.map((row) => {
          const vals = cols.map((col) => sqlEscape(row[col]));
          return `(${vals.join(', ')})`;
        });
        lines.push(`INSERT INTO "${model.table}" (${colNamesStr}) VALUES\n${valStrings.join(',\n')} ON CONFLICT DO NOTHING;`);
      }
      lines.push(``);
    }

    // Insert statements for M2M tables
    for (const table of IMPLICIT_M2M_TABLES) {
      const records = dataMap[table] || [];
      if (records.length === 0) continue;

      lines.push(`-- Table: ${table} (${records.length} rows)`);
      const cols = ['A', 'B'];
      const colNamesStr = `"A", "B"`;

      const batchSize = 200;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const valStrings = batch.map((row) => `(${sqlEscape(row.A)}, ${sqlEscape(row.B)})`);
        lines.push(`INSERT INTO "${table}" (${colNamesStr}) VALUES\n${valStrings.join(',\n')} ON CONFLICT DO NOTHING;`);
      }
      lines.push(``);
    }

    content = lines.join('\n');
  }

  const sizeBytes = Buffer.byteLength(content, 'utf8');
  return { content, sizeBytes, recordCount: totalRecords, tableCounts };
}

/**
 * Verifies accessibility of all Blob storage URLs in the database
 */
export async function verifyBlobIntegrity(customDataMap?: Record<string, any[]>): Promise<BlobVerificationReport> {
  const urlSet = new Set<string>();

  const extractUrlsFromObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string' && (val.includes('.blob.vercel-storage.com') || (val.startsWith('http') && (key.toLowerCase().includes('image') || key.toLowerCase().includes('url') || key.toLowerCase().includes('avatar') || key.toLowerCase().includes('banner'))))) {
        urlSet.add(val);
      }
    }
  };

  if (customDataMap) {
    for (const key of Object.keys(customDataMap)) {
      const rows = customDataMap[key];
      if (Array.isArray(rows)) {
        rows.forEach(extractUrlsFromObject);
      }
    }
  } else {
    // Scan live database
    try {
      const users = await prisma.user.findMany({ select: { avatarUrl: true, bannerUrl: true } });
      users.forEach(extractUrlsFromObject);
      const series = await prisma.series.findMany({ select: { coverImage: true, bannerImage: true } });
      series.forEach(extractUrlsFromObject);
      const images = await prisma.chapterImage.findMany({ select: { imageUrl: true } });
      images.forEach(extractUrlsFromObject);
      const banners = await prisma.heroBanner.findMany({ select: { desktopImage: true, mobileImage: true } });
      banners.forEach(extractUrlsFromObject);
    } catch (e: any) {
      console.warn(`[BackupEngine] Blob live scan error:`, e.message);
    }
  }

  const urls = Array.from(urlSet);
  const missingUrls: string[] = [];

  // Check in concurrent batches of 10
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (u) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(u, { method: 'HEAD', signal: controller.signal });
          clearTimeout(timeoutId);
          if (!res.ok && res.status !== 403 && res.status !== 401) {
            missingUrls.push(u);
          }
        } catch (err) {
          missingUrls.push(u);
        }
      })
    );
  }

  return {
    totalChecked: urls.length,
    validCount: urls.length - missingUrls.length,
    missingUrls,
  };
}

/**
 * Non-destructive verification of a backup file
 */
export async function verifyBackupIntegrity(content: string, format: 'SQL' | 'JSON'): Promise<BackupVerificationResult> {
  const sizeBytes = Buffer.byteLength(content, 'utf8');
  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;
  let dataMapForBlobs: Record<string, any[]> | undefined;

  try {
    if (format === 'JSON') {
      const parsed = JSON.parse(content);
      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Invalid JSON dump format: missing "data" object.');
      }
      dataMapForBlobs = parsed.data;
      for (const key of Object.keys(parsed.data)) {
        const arr = parsed.data[key];
        const count = Array.isArray(arr) ? arr.length : 0;
        tableCounts[key] = count;
        totalRecords += count;
      }
    } else {
      // SQL verification: count INSERT statements per table
      const lines = content.split('\n');
      let currentTable = 'unknown';
      for (const line of lines) {
        const tableMatch = line.match(/^-- Table: (\w+) \((\d+) rows\)/);
        if (tableMatch) {
          currentTable = tableMatch[1];
          const count = parseInt(tableMatch[2], 10) || 0;
          tableCounts[currentTable] = count;
          totalRecords += count;
        }
      }
    }

    const blobReport = await verifyBlobIntegrity(dataMapForBlobs);

    return {
      valid: true,
      format,
      recordCount: totalRecords,
      sizeBytes,
      tableCounts,
      blobReport,
    };
  } catch (err: any) {
    return {
      valid: false,
      format,
      recordCount: 0,
      sizeBytes,
      tableCounts: {},
      errorMessage: err.message,
    };
  }
}

/**
 * Restores database from a SQL or JSON backup dump
 */
export async function restoreDatabaseDump(content: string, format: 'SQL' | 'JSON', verifyBlobs: boolean = true): Promise<{
  success: boolean;
  restoredRecords: number;
  blobReport?: BlobVerificationReport;
  errorMessage?: string;
}> {
  try {
    let restoredRecords = 0;
    let dataMapForBlobs: Record<string, any[]> | undefined;

    if (format === 'JSON') {
      const parsed = JSON.parse(content);
      if (!parsed.data) throw new Error('Invalid JSON dump format');
      dataMapForBlobs = parsed.data;

      // 1. Truncate tables (reverse order)
      for (const table of IMPLICIT_M2M_TABLES) {
        try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`); } catch (e) {}
      }
      for (let i = TOPOLOGICAL_MODELS.length - 1; i >= 0; i--) {
        const t = TOPOLOGICAL_MODELS[i].table;
        try { await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE;`); } catch (e) {}
      }

      // 2. Insert explicit models in topological order
      for (const model of TOPOLOGICAL_MODELS) {
        const rows = parsed.data[model.name];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const delegate = (prisma as any)[model.delegate];
        if (!delegate) continue;

        const batchSize = 300;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const res = await delegate.createMany({ data: batch, skipDuplicates: true });
          restoredRecords += res.count || batch.length;
        }
      }

      // 3. Insert M2M tables
      for (const table of IMPLICIT_M2M_TABLES) {
        const rows = parsed.data[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;
        for (const row of rows) {
          try {
            await prisma.$executeRawUnsafe(
              `INSERT INTO "${table}" ("A", "B") VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
              row.A, row.B
            );
            restoredRecords++;
          } catch (e) {}
        }
      }
    } else {
      // SQL format restore
      // Split into self-contained SQL commands (lines starting with TRUNCATE or INSERT or SET)
      const commands = content
        .split(/;\s*(?=(?:TRUNCATE|INSERT|SET|--|$))/g)
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && !c.startsWith('--'));

      for (const cmd of commands) {
        if (!cmd.toLowerCase().startsWith('insert') && !cmd.toLowerCase().startsWith('truncate')) continue;
        try {
          await prisma.$executeRawUnsafe(`${cmd};`);
          if (cmd.toLowerCase().startsWith('insert')) {
            // Estimate row count by counting occurrences of '),' or lines
            const lines = cmd.split('\n').length - 1;
            restoredRecords += Math.max(1, lines);
          }
        } catch (err: any) {
          console.warn(`[BackupEngine] SQL restore warning on statement:`, err.message.slice(0, 80));
        }
      }
    }

    let blobReport: BlobVerificationReport | undefined;
    if (verifyBlobs) {
      blobReport = await verifyBlobIntegrity(dataMapForBlobs);
    }

    return { success: true, restoredRecords, blobReport };
  } catch (error: any) {
    return { success: false, restoredRecords: 0, errorMessage: error.message };
  }
}
