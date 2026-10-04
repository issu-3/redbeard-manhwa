import { prisma } from './src/lib/prisma';

async function main() {
  const chapters = await prisma.chapter.findMany();
  
  const unpublished = chapters.filter((c: any) => !c.isPublished);
  console.log('Unpublished chapters:', unpublished.length);
  
  const seriesGroups = unpublished.reduce((acc: any, c: any) => {
      acc[c.seriesId] = (acc[c.seriesId] || 0) + 1;
      return acc;
  }, {});
  console.log('Unpublished by series:', seriesGroups);
}

main().finally(() => prisma.$disconnect());
