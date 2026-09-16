import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BAD_TEXT = 'REDESIGN AD PLACEMENT SYSTEM';

async function main() {
  console.log('Cleaning up accidental prompt text from DB...');
  
  // 1. SiteSettings
  const settings = await prisma.siteSetting.findMany();
  for (const s of settings) {
    if (s.value.includes(BAD_TEXT)) {
      console.log(`Fixing SiteSetting: ${s.key}`);
      let newValue = '';
      if (s.key === 'siteName') newValue = 'REDBEARD';
      if (s.key === 'seo_site_title') newValue = 'REDBEARD - The Ultimate Reading Experience';
      if (s.key === 'seo_site_description') newValue = 'Premium reading platform offering the best reading experience.';
      
      await prisma.siteSetting.update({
        where: { key: s.key },
        data: { value: newValue }
      });
    }
  }

  // 2. HeroBanners
  const banners = await prisma.heroBanner.findMany();
  for (const b of banners) {
    if ((b.title && b.title.includes(BAD_TEXT)) || (b.subtitle && b.subtitle.includes(BAD_TEXT))) {
      console.log(`Fixing HeroBanner: ${b.id}`);
      await prisma.heroBanner.update({
        where: { id: b.id },
        data: { 
          title: b.title?.includes(BAD_TEXT) ? '' : b.title,
          subtitle: b.subtitle?.includes(BAD_TEXT) ? '' : b.subtitle
        }
      });
    }
  }

  // 3. Announcements
  const announcements = await prisma.announcement.findMany();
  for (const a of announcements) {
    if (a.title.includes(BAD_TEXT) || a.content.includes(BAD_TEXT)) {
      console.log(`Fixing Announcement: ${a.id}`);
      // Since announcements are usually short-lived, it's safer to just delete the corrupted one
      await prisma.announcement.delete({
        where: { id: a.id }
      });
    }
  }

  // 4. Homepage Sections
  const sections = await prisma.homepageSection.findMany();
  for (const s of sections) {
    if ((s.title && s.title.includes(BAD_TEXT)) || (s.subtitle && s.subtitle.includes(BAD_TEXT))) {
      console.log(`Fixing HomepageSection: ${s.id}`);
      await prisma.homepageSection.update({
        where: { id: s.id },
        data: { 
          title: s.title?.includes(BAD_TEXT) ? null : s.title,
          subtitle: s.subtitle?.includes(BAD_TEXT) ? null : s.subtitle
        }
      });
    }
  }

  // 5. Series
  const series = await prisma.series.findMany();
  for (const s of series) {
    if (s.title.includes(BAD_TEXT) || s.description.includes(BAD_TEXT) || (s.synopsis && s.synopsis.includes(BAD_TEXT))) {
      console.log(`Fixing Series: ${s.id}`);
      await prisma.series.update({
        where: { id: s.id },
        data: {
          title: s.title.includes(BAD_TEXT) ? 'Restored Title' : s.title,
          description: s.description.includes(BAD_TEXT) ? 'Description restored.' : s.description,
          synopsis: s.synopsis?.includes(BAD_TEXT) ? 'Synopsis restored.' : s.synopsis
        }
      });
    }
  }

  console.log('Database cleanup completed.');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
