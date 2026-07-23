import { prisma } from '../src/lib/prisma';

const genres = [
  'Action', 'Adaptation', 'Adventure', 'Comedy', 'Cooking', 'Demons', 
  'Doujinshi', 'Drama', 'Ecchi', 'Fantasy', 'Full Color', 'Gender Bender', 
  'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Long Strip', 
  'Magic', 'Manga', 'Martial Arts', 'Monster', 'Mystery', 'Office Workers', 
  'Psychological', 'Reincarnation', 'School Life', 'Sci Fi', 'Seinen', 
  'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice Of Life', 
  'Sports', 'Supernatural', 'Thriller', 'Time Travel', 'Tragedy', 
  'Villainess', 'Web Comic', 'Webtoons', 'Yaoi', 'Yuri', 'Zombies'
];

async function main() {
  console.log(`Start seeding genres...`);
  
  for (const name of genres) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const genre = await prisma.genre.upsert({
      where: { name: name.toUpperCase() }, // Assuming they are stored as uppercase? Let's check image.
      update: {},
      create: {
        name: name.toUpperCase(),
        slug: slug,
      },
    });
    console.log(`Created/Updated genre with name: ${genre.name}`);
  }
  
  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
