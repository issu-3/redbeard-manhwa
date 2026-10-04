import { prisma } from './src/lib/prisma';

async function main() {
  const seriesCount = await prisma.series.count();
  const chapterCount = await prisma.chapter.count();
  const publishedChapterCount = await prisma.chapter.count({ where: { isPublished: true } });
  
  console.log(`Total Series: ${seriesCount}`);
  console.log(`Total Chapters: ${chapterCount}`);
  console.log(`Published Chapters: ${publishedChapterCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
