import { prisma } from './src/lib/prisma';

async function main() {
  const settings = await prisma.siteSetting.findMany();
  let found = false;
  
  for (const s of settings) {
    if (s.value.includes('REDESIGN AD PLACEMENT SYSTEM') || s.value.includes('DOWNLOAD BASED ONLY')) {
      console.log(`Found bad string in SiteSetting key: ${s.key}, value: ${s.value}`);
      found = true;
    }
  }
  
  if (!found) {
    console.log('No bad strings found in SiteSetting table.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
