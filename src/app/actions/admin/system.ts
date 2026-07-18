'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

async function checkAdmin() {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized');
  }
}

export type SystemHealthData = {
  database: {
    status: 'Healthy' | 'Warning' | 'Offline';
    responseTime: number | 'Not Available';
    size: string | 'Not Available';
    tables: number | 'Not Available';
  };
  storage: {
    provider: string;
    imagesCount: number | 'Not Available';
    pagesCount: number | 'Not Available';
    coversCount: number | 'Not Available';
    bannersCount: number | 'Not Available';
  };
  cache: {
    status: 'Active' | 'Disabled';
    lastRefresh: string | 'Not Available';
    pagesCached: number | 'Not Available';
  };
  server: {
    uptime: string | 'Not Available';
    apiResponseTime: number | 'Not Available';
    failedRequests: number | 'Not Available';
    successRequests: number | 'Not Available';
  };
  authentication: {
    google: 'Configured' | 'Not Configured';
    discord: 'Configured' | 'Not Configured';
    email: 'Configured' | 'Not Configured';
  };
  backgroundJobs: {
    homepageAutomation: 'Running' | 'Disabled';
    scheduledJobs: number | 'Not Available';
    failedJobs: number | 'Not Available';
    lastRun: string | 'Not Available';
  };
  security: {
    https: 'Enabled' | 'Disabled';
    envMissing: string[];
    adminAuth: 'Healthy' | 'Warning';
  };
};

export async function getSystemHealth(): Promise<SystemHealthData> {
  await checkAdmin();

  const health: SystemHealthData = {
    database: { status: 'Offline', responseTime: 'Not Available', size: 'Not Available', tables: 'Not Available' },
    storage: { provider: 'Local', imagesCount: 'Not Available', pagesCount: 'Not Available', coversCount: 'Not Available', bannersCount: 'Not Available' },
    cache: { status: 'Active', lastRefresh: 'Not Available', pagesCached: 'Not Available' },
    server: { uptime: 'Not Available', apiResponseTime: 'Not Available', failedRequests: 'Not Available', successRequests: 'Not Available' },
    authentication: { google: 'Not Configured', discord: 'Not Configured', email: 'Not Configured' },
    backgroundJobs: { homepageAutomation: 'Disabled', scheduledJobs: 'Not Available', failedJobs: 'Not Available', lastRun: 'Not Available' },
    security: { https: 'Disabled', envMissing: [], adminAuth: 'Healthy' }
  };

  // 1. Database Check
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const end = performance.now();
    const ms = Math.round(end - start);
    health.database.responseTime = ms;
    health.database.status = ms > 200 ? 'Warning' : 'Healthy';

    try {
      const sizeRes: any = await prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) as size`;
      if (sizeRes && sizeRes[0] && sizeRes[0].size) health.database.size = sizeRes[0].size;
      
      const tablesRes: any = await prisma.$queryRaw`SELECT count(*) as count FROM information_schema.tables WHERE table_schema='public'`;
      if (tablesRes && tablesRes[0] && tablesRes[0].count) health.database.tables = Number(tablesRes[0].count);
    } catch (e) {
      // Ignore if not supported (e.g., non-postgres)
    }
  } catch (err) {
    health.database.status = 'Offline';
  }

  // 2. Storage Check
  try {
    const totalImages = await prisma.chapterImage.count();
    const coversCount = await prisma.series.count({ where: { coverImage: { not: '' } } });
    const bannersCount = await prisma.series.count({ where: { bannerImage: { not: '' } } });
    
    health.storage.imagesCount = totalImages;
    health.storage.pagesCount = totalImages;
    health.storage.coversCount = coversCount;
    health.storage.bannersCount = bannersCount;
  } catch (err) {
    // Graceful fallback
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) health.storage.provider = 'Vercel Blob';
  else if (process.env.S3_BUCKET_NAME) health.storage.provider = 'AWS S3';
  else if (process.env.R2_ACCOUNT_ID) health.storage.provider = 'Cloudflare R2';
  else if (process.env.UPLOADTHING_SECRET) health.storage.provider = 'UploadThing';
  else health.storage.provider = 'Local / Vercel Default';

  // 3. Cache & Server
  health.cache.status = 'Active';
  health.server.uptime = `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`;

  // 4. Authentication
  if (process.env.GOOGLE_CLIENT_ID) health.authentication.google = 'Configured';
  if (process.env.DISCORD_CLIENT_ID) health.authentication.discord = 'Configured';
  if (process.env.EMAIL_SERVER) health.authentication.email = 'Configured';

  // 5. Background Jobs (Homepage Automation)
  try {
    const automation = await prisma.siteSetting.findUnique({
      where: { key: 'global_automation' }
    });
    if (automation?.value === 'true') {
      health.backgroundJobs.homepageAutomation = 'Running';
    }
  } catch (err) {
    // Graceful fallback
  }

  // 6. Security
  const isProd = process.env.NODE_ENV === 'production';
  health.security.https = isProd ? 'Enabled' : 'Disabled';
  
  const requiredEnvs = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
  requiredEnvs.forEach(env => {
    if (!process.env[env]) health.security.envMissing.push(env);
  });

  return health;
}
