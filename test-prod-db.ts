import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config(); // Assuming .env is the production db

const prisma = new PrismaClient();

async function main() {
  // Let's find any chapter with a downloadUrl starting with 'gdrive:'
  const chapters = await prisma.chapter.findMany({
    where: {
      sourceType: 'DOWNLOAD'
    },
    take: 5
  });
  
  console.log('Chapters with DOWNLOAD source:');
  for (const c of chapters) {
    console.log(c.id, c.slug, c.downloadUrl);
  }
  
  // Or check UPLOAD chapters
  const uploadChapters = await prisma.chapter.findMany({
    where: {
      sourceType: 'UPLOAD'
    },
    take: 1
  });
  
  console.log('\\nUpload Chapter:');
  if (uploadChapters.length > 0) {
    const c = uploadChapters[0];
    console.log(c.id, c.slug);
    const img = await prisma.chapterImage.findFirst({ where: { chapterId: c.id }});
    console.log('Image:', img?.imageUrl);
  }
}

main().then(() => prisma.$disconnect()).catch(console.error);
