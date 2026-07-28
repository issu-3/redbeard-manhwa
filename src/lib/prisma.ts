import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL && typeof window === 'undefined') {
  try {
    const envPaths = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), '.env.neon'),
      path.resolve(process.cwd(), '.env.production.local')
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach((line) => {
          const match = line.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let val = match[2].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!val.includes('[SENSITIVE]') && val.length > 5 && (!process.env[key] || process.env[key]?.includes('[SENSITIVE]'))) {
              process.env[key] = val;
            }
          }
        });
      }
    }
  } catch (e) {}
}

let connectionString = process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

if (connectionString?.includes('prisma_migration')) {
  console.warn('WARNING: DATABASE_URL is using the "prisma_migration" role, which has low connection limits. This will cause P2037 errors during builds.');
  if (process.env.POSTGRES_PRISMA_URL && !process.env.POSTGRES_PRISMA_URL.includes('prisma_migration')) {
    console.log('Falling back to POSTGRES_PRISMA_URL for pooled connections.');
    connectionString = process.env.POSTGRES_PRISMA_URL;
  }
}
const prismaClientSingleton = () => {
  const isLocal = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 5 : 2,
    idleTimeoutMillis: 15000,
    allowExitOnIdle: true,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Ensure global object caches the PrismaClient and pg Pool across both development HMR
// and production serverless Lambda container reuses.
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

globalThis.prismaGlobal = prisma;
