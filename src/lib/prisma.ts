import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;

const prismaClientSingleton = () => {
  // We configure a shared Pool to prevent exhausting connections in serverless environments.
  // This uses the pooled connection string (DATABASE_URL).
  const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === 'production' ? 10 : 2,
    idleTimeoutMillis: 15000,
    allowExitOnIdle: true,
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

// In development, the global object ensures we don't spawn multiple PrismaClient 
// or pg Pool instances across Hot Module Replacements.
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
