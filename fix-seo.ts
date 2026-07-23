import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const series = await prisma.series.findMany({ select: { id: true, title: true, synopsis: true, slug: true, coverImage: true, seo: true } });
  const chapters = await prisma.chapter.findMany({ select: { id: true, title: true, number: true, slug: true, seo: true, series: { select: { title: true, slug: true, coverImage: true } } } });

  const titles = new Set();
  const descriptions = new Set();
  
  for (const s of series) {
    const existingSeo = s.seo && typeof s.seo === 'string' ? JSON.parse(s.seo) : (s.seo || {});
    
    let title = existingSeo.title || `Read ${s.title} Manhwa | REDBEARD`;
    let desc = existingSeo.description || (s.synopsis ? s.synopsis.substring(0, 150) : `Read the latest chapters of ${s.title} on REDBEARD. High quality manhwa and webtoons.`);
    
    if (titles.has(title)) { title = `${title} - ${s.id.substring(0, 4)}`; }
    titles.add(title);
    
    if (descriptions.has(desc)) { desc = `${desc} - ${s.id.substring(0, 4)}`; }
    descriptions.add(desc);

    await prisma.series.update({
      where: { id: s.id },
      data: {
        seo: JSON.stringify({
          ...existingSeo,
          title: title,
          description: desc,
          ogImage: existingSeo.ogImage || s.coverImage,
          canonical: existingSeo.canonical || `https://redbeard-manhwa.vercel.app/series/${s.slug}`
        })
      }
    });
  }

  for (const c of chapters) {
    const existingSeo = c.seo && typeof c.seo === 'string' ? JSON.parse(c.seo) : (c.seo || {});
    
    const chLabel = c.number !== null ? `Chapter ${c.number}` : (c.title || c.slug || 'Latest Chapter');
    let title = existingSeo.title || `Read ${c.series.title} - ${chLabel} | REDBEARD`;
    let desc = existingSeo.description || `Read ${c.series.title} ${chLabel} online. High quality manhwa and webtoons available at REDBEARD.`;
    
    if (titles.has(title)) { title = `${title} - ${c.id.substring(0, 4)}`; }
    titles.add(title);
    
    if (descriptions.has(desc)) { desc = `${desc} - ${c.id.substring(0, 4)}`; }
    descriptions.add(desc);

    await prisma.chapter.update({
      where: { id: c.id },
      data: {
        seo: JSON.stringify({
          ...existingSeo,
          title: title,
          description: desc,
          ogImage: existingSeo.ogImage || c.series.coverImage,
          canonical: existingSeo.canonical || `https://redbeard-manhwa.vercel.app/series/${c.series.slug}/chapter/${c.slug}`
        })
      }
    });
  }
  
  console.log('Fixed all duplicates and missing OG tags');
}

main().finally(() => prisma.$disconnect());
