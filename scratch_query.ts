import { prisma } from './src/lib/prisma';

async function main() {
  const chapters = await prisma.chapter.findMany({
    include: { images: true }
  });
  
  const badChapters = chapters.filter((c: any) => c.totalPages === 0 && c.images.length > 0);
  console.log('Chapters with 0 totalPages but >0 images:', badChapters.length);
  if (badChapters.length > 0) {
      console.log('Example:', badChapters[0].id);
  }
}

main().finally(() => prisma.$disconnect());
