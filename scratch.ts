import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const series = await prisma.series.findMany({ select: { id: true, title: true, seo: true } });
  const chapters = await prisma.chapter.findMany({ select: { id: true, title: true, seo: true } });
  
  console.log(JSON.stringify(series, null, 2));
  console.log(JSON.stringify(chapters, null, 2));
}

main().finally(() => prisma.$disconnect());
