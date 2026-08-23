import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const temporaryPassword = process.env.ADMIN_PASSWORD;

  if (!email || !temporaryPassword) {
    console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
    console.log('Usage: ADMIN_EMAIL="your@email.com" ADMIN_PASSWORD="YourSecurePassword" npm run bootstrap-admin');
    process.exit(1);
  }

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

  console.log('✅ Success! Admin user seeded:');
  console.log(`ID: ${adminUser.id}`);
  console.log(`Email: ${adminUser.email}`);
  console.log(`Role: ${adminUser.role}`);
  console.log('⚠️  Please change this password immediately after logging in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
