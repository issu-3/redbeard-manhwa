const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({ select: { createdAt: true } });
  console.log('Users count:', users.length);
  console.log('User dates:', users.map(u => u.createdAt));

  const chapters = await prisma.chapter.findMany({ select: { createdAt: true } });
  console.log('Chapters count:', chapters.length);
  console.log('Chapter dates:', chapters.map(c => c.createdAt));
}
run().catch(console.error).finally(() => prisma.$disconnect());
