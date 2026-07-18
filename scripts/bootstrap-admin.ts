import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'irshadansaripagla@gmail.com';
  
  console.log(`Looking for user with email: ${email}`);
  
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    console.log('Creating admin user...');
    
    // In a real app we'd hash a password, but we assume the user exists or will register
    // For now, if the user doesn't exist, we just output instructions
    console.error('Please register an account with this email through the UI first, then run this script again.');
    process.exit(1);
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      role: 'ADMIN',
    },
  });

  console.log('Success! User promoted to ADMIN:');
  console.log(`ID: ${updatedUser.id}`);
  console.log(`Email: ${updatedUser.email}`);
  console.log(`Role: ${updatedUser.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
