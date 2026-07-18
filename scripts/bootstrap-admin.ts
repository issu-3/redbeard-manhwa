import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'irshadansaripagla@gmail.com';
  const temporaryPassword = 'AdminPassword123!';
  
  console.log(`Seeding admin user with email: ${email}`);
  
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      passwordHash: passwordHash,
    },
    create: {
      email,
      username: 'admin',
      displayName: 'System Admin',
      passwordHash: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Success! Admin user seeded:');
  console.log(`ID: ${adminUser.id}`);
  console.log(`Email: ${adminUser.email}`);
  console.log(`Role: ${adminUser.role}`);
  console.log(`Temporary Password: ${temporaryPassword}`);
  console.log('Please change this password immediately after logging in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
