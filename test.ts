import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ select: { createdAt: true } });
  console.log('User dates:', users.map(u => u.createdAt));

  const chapters = await prisma.chapter.findMany({ select: { createdAt: true } });
  console.log('Chapter dates:', chapters.map(c => c.createdAt));
}
run();
